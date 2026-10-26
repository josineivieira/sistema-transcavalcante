import base64
import gzip
import io
import re
from contextlib import contextmanager
from urllib.parse import urlparse

import httpx
from lxml import etree

from app.services.fiscal.certificates.a1 import mtls_context
from app.services.fiscal.contracts import FiscalEmissionResult
from app.services.fiscal.nfse.xml_builder import DpsError, NS, validate_xml

DEFAULT_BASE = "https://sefin.producaorestrita.nfse.gov.br/API/SefinNacional"
ALLOWED_HOST = "sefin.producaorestrita.nfse.gov.br"
MAX_XML = 10 * 1024 * 1024


class NationalError(ValueError):
    def __init__(self, message, uncertain=False, details=None):
        super().__init__(message)
        self.uncertain = uncertain
        self.details = details or {}


def endpoint(value):
    value = (value or DEFAULT_BASE).rstrip("/")
    parsed = urlparse(value)
    if parsed.scheme != "https" or parsed.hostname != ALLOWED_HOST or parsed.port not in {None, 443} or parsed.username or parsed.password or parsed.query or parsed.fragment or parsed.path.lower() not in {"/sefinnacional", "/api/sefinnacional"}:
        raise NationalError("Use o endpoint oficial da SEFIN Nacional em produção restrita. Produção não está habilitada neste fluxo.")
    return value


def encode_xml(xml): return base64.b64encode(gzip.compress(xml.encode("utf-8"), mtime=0)).decode("ascii")


def decode_xml(encoded):
    try:
        compressed = base64.b64decode(encoded, validate=True)
        with gzip.GzipFile(fileobj=io.BytesIO(compressed)) as stream: raw = stream.read(MAX_XML + 1)
        if len(raw) > MAX_XML: raise ValueError()
        root = etree.fromstring(raw, etree.XMLParser(resolve_entities=False, no_network=True, load_dtd=False, huge_tree=False))
        if root.getroottree().docinfo.doctype: raise ValueError()
        return root, raw.decode("utf-8")
    except (ValueError, TypeError, OSError, etree.XMLSyntaxError, UnicodeError):
        raise NationalError("A API retornou XML inválido ou acima do limite. Consulte a DPS antes de reenviar.", uncertain=True) from None


def parse_authorized(body, expected_dps=None):
    if not isinstance(body, dict) or not body.get("nfseXmlGZipB64"):
        raise NationalError("Retorno sem XML autorizado. Consulte a DPS antes de reenviar.", uncertain=True)
    root, xml = decode_xml(body["nfseXmlGZipB64"])
    try: validate_xml(root, "NFSe_v1.01.xsd")
    except DpsError as exc: raise NationalError(str(exc), uncertain=True) from None
    if root.tag != f"{{{NS}}}NFSe": raise NationalError("A resposta não é uma NFS-e.", uncertain=True)
    info = root.find(f"{{{NS}}}infNFSe")
    dps = root.find(f".//{{{NS}}}infDPS")
    if info is None or dps is None or dps.findtext(f"{{{NS}}}tpAmb") != "2": raise NationalError("Ambiente ou estrutura da NFS-e incompatíveis.", uncertain=True)
    if expected_dps and dps.get("Id") != expected_dps: raise NationalError("A NFS-e recebida pertence a outra DPS.", uncertain=True)
    access_key = str(body.get("chaveAcesso") or info.get("Id", "").removeprefix("NFS"))
    if not re.fullmatch(r"[0-9]{50}", access_key) or info.get("Id") != "NFS" + access_key: raise NationalError("Chave de acesso incompatível com o XML.", uncertain=True)
    number = info.findtext(f"{{{NS}}}nNFSe")
    if not number: raise NationalError("Retorno sem número oficial da NFS-e.", uncertain=True)
    return FiscalEmissionResult(status="authorized", provider="nfse_nacional", number=number, series=dps.findtext(f"{{{NS}}}serie"), access_key=access_key, reference=dps.get("Id"), protocol=str(body.get("protocolo") or "") or None, authorized_xml=xml, raw_response=body)


class NationalClient:
    def __init__(self, credentials, base_url=None, transport=None):
        self.credentials = credentials
        self.base_url = endpoint(base_url)
        self.transport = transport

    @contextmanager
    def session(self):
        with mtls_context(*self.credentials) as context:
            with httpx.Client(verify=context, timeout=httpx.Timeout(45, connect=10), follow_redirects=False, trust_env=False, transport=self.transport) as client: yield client

    def request(self, method, path, payload=None, missing_ok=False):
        try:
            with self.session() as client:
                response = client.request(method, self.base_url + path, json=payload)
        except httpx.RequestError:
            raise NationalError("Falha de conexão com a NFS-e Nacional. Consulte o resultado antes de repetir a emissão.", uncertain=method == "POST") from None
        try: body = response.json()
        except ValueError: body = {}
        if response.status_code == 404 and missing_ok: return None
        if response.status_code >= 500 or response.status_code in {408, 429}:
            raise NationalError("A API fiscal está indisponível. Consulte a DPS antes de reenviar.", uncertain=True, details={"httpStatus": response.status_code})
        if not 200 <= response.status_code < 300:
            errors = body.get("erros", body.get("errors", [])) if isinstance(body, dict) else []
            descriptions = [str(item.get("Descricao") or item.get("descricao") or item.get("Mensagem") or item.get("mensagem") or item.get("Codigo") or item) for item in errors] if isinstance(errors, list) else [str(errors)]
            message = " | ".join(descriptions)[:1800] or f"API fiscal retornou HTTP {response.status_code}. Confira certificado, credenciamento e endpoint."
            raise NationalError(message, details={"httpStatus": response.status_code, "errors": errors})
        return body

    def issue_signed(self, xml, expected_dps):
        body = self.request("POST", "/nfse", {"dpsXmlGZipB64": encode_xml(xml)})
        return parse_authorized(body, expected_dps)

    def consult_dps(self, dps_id):
        body = self.request("GET", "/dps/" + dps_id, missing_ok=True)
        if body is None: return None
        key = str(body.get("chaveAcesso") or "")
        if not re.fullmatch(r"[0-9]{50}", key): raise NationalError("Consulta da DPS sem chave de acesso válida.", uncertain=True)
        return self.consult(key, dps_id)

    def consult(self, access_key, expected_dps=None):
        if not re.fullmatch(r"[0-9]{50}", access_key): raise NationalError("Chave de acesso inválida.")
        return parse_authorized(self.request("GET", "/nfse/" + access_key), expected_dps)

    def cancel_signed(self, access_key, xml):
        body = self.request("POST", "/nfse/" + access_key + "/eventos", {"pedidoRegistroEventoXmlGZipB64": encode_xml(xml)})
        if not self.has_cancel_event(body, access_key):
            raise NationalError("Pedido enviado sem evento de cancelamento confirmado. Consulte a situação da nota.", uncertain=True)
        return body

    @staticmethod
    def has_cancel_event(body, access_key):
        def documents(value):
            if isinstance(value, dict):
                for key, item in value.items():
                    if key.lower().endswith("xmlgzipb64") and isinstance(item, str): yield item
                    else: yield from documents(item)
            elif isinstance(value, list):
                for item in value: yield from documents(item)
        for encoded in documents(body):
            root, _ = decode_xml(encoded)
            try: validate_xml(root, "evento_v1.01.xsd")
            except DpsError: continue
            if root.find(f".//{{{NS}}}e101101") is not None and access_key in root.xpath(".//n:chNFSe/text()", namespaces={"n": NS}): return True
        return False

    def events(self, access_key): return self.request("GET", "/nfse/" + access_key + "/eventos")

    def municipal_parameters(self, city):
        if not re.fullmatch(r"[0-9]{7}", city): raise NationalError("Código IBGE inválido.")
        return self.request("GET", "/parametros_municipais/" + city + "/convenio")

    def danfse(self, access_key):
        if not re.fullmatch(r"[0-9]{50}", access_key): raise NationalError("Chave de acesso inválida.")
        try:
            with self.session() as client:
                response = client.get("https://adn.producaorestrita.nfse.gov.br/danfse/" + access_key)
            if response.status_code != 200 or not response.content.startswith(b"%PDF-") or len(response.content) > MAX_XML:
                raise NationalError("O DANFSe oficial ainda não está disponível. Consulte novamente mais tarde.")
            return response.content
        except httpx.RequestError: raise NationalError("Falha ao consultar o DANFSe oficial.") from None
