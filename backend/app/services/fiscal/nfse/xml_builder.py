import re
from datetime import datetime
from decimal import Decimal, InvalidOperation
from functools import lru_cache
from pathlib import Path
from zoneinfo import ZoneInfo

from cryptography.hazmat.primitives import serialization
from lxml import etree
from signxml import XMLSigner, methods

from app.core.config import settings
from app.core.customer_document import normalize_document, valid_customer_document

NS = "http://www.sped.fazenda.gov.br/nfse"
DS = "http://www.w3.org/2000/09/xmldsig#"
SCHEMAS = Path(__file__).parent / "schemas"


class DpsError(ValueError): pass


def digits(value): return re.sub(r"[^0-9]", "", str(value or ""))


def decimal_text(value):
    try:
        result = Decimal(str(value).replace(",", "."))
        if not result.is_finite() or result < 0: raise InvalidOperation
        return format(result.quantize(Decimal("0.01")), "f")
    except (InvalidOperation, ValueError): raise DpsError("Valor ou alíquota inválidos.") from None


def dps_identifier(issuer, series, number):
    cnpj = normalize_document(str(issuer["document"]))
    return f"DPS{digits(issuer['cityCode'])}2{cnpj}{int(series):05d}{int(number):015d}"


def node(parent, name, value=None):
    element = etree.SubElement(parent, f"{{{NS}}}{name}")
    if value is not None: element.text = str(value)
    return element


@lru_cache(maxsize=8)
def schema(name):
    parser = etree.XMLParser(resolve_entities=False, no_network=True)
    return etree.XMLSchema(etree.parse(str(SCHEMAS / name), parser))


def validate_xml(root, filename="DPS_v1.01.xsd"):
    validator = schema(filename)
    if not validator.validate(root):
        errors = [str(item.message)[:400] for item in list(validator.error_log)[-5:]]
        raise DpsError("XML fora do leiaute oficial: " + " | ".join(errors))


def validate_data(issuer, customer, amount, description):
    errors = []
    if issuer.get("nfseDataConfirmed") != "Sim": errors.append("Confirme os dados fiscais na tela de configurações.")
    if not valid_customer_document(str(issuer.get("document", "")), "Juridica"): errors.append("CNPJ do prestador inválido.")
    for data, label in [(issuer, "prestador"), (customer, "tomador")]:
        if not re.fullmatch(r"[0-9]{7}", str(data.get("cityCode", ""))): errors.append(f"Código IBGE do {label} deve ter 7 dígitos.")
    document = str(customer.get("document", ""))
    kind = "Fisica" if len(normalize_document(document)) == 11 else "Juridica"
    if not valid_customer_document(document, kind): errors.append("CPF/CNPJ do tomador inválido.")
    if not customer.get("name"): errors.append("Nome do tomador não informado.")
    if not re.fullmatch(r"[0-9]{6}", str(issuer.get("nationalServiceCode", ""))): errors.append("cTribNac deve ter 6 dígitos; o item da lista (ex.: 16.02) não substitui esse código.")
    if not str(description).strip() or len(description) > 2000: errors.append("A discriminação deve ter entre 1 e 2000 caracteres.")
    try:
        if Decimal(decimal_text(amount)) <= 0: errors.append("O valor do serviço deve ser maior que zero.")
    except DpsError as exc: errors.append(str(exc))
    if issuer.get("nationalSimpleRegime", "3" if issuer.get("simplesNacional") == "Sim" else "1") not in {"1", "2", "3"}: errors.append("Situação do Simples Nacional inválida.")
    if issuer.get("ibsCbsEnabled") == "Sim":
        for key, size, label in [("ibsCbsCst", 3, "CST IBS/CBS"), ("ibsCbsClass", 6, "Classificação IBS/CBS"), ("ibsCbsOperation", 6, "Indicador de operação IBS/CBS")]:
            if not re.fullmatch(r"[0-9]{%d}" % size, str(issuer.get(key, ""))): errors.append(f"{label} deve ter {size} dígitos.")
    return errors


def address(parent, data):
    # National address is optional, but when included its complete mandatory group must exist.
    if not all(data.get(key) for key in ["street", "number", "district", "zipCode", "cityCode"]):
        raise DpsError("Complete logradouro, número, bairro, CEP e código IBGE do tomador.")
    end = node(parent, "end"); local = node(end, "endNac")
    node(local, "cMun", digits(data["cityCode"])); node(local, "CEP", digits(data["zipCode"]))
    node(end, "xLgr", data["street"]); node(end, "nro", data["number"])
    if data.get("complement"): node(end, "xCpl", data["complement"])
    node(end, "xBairro", data["district"])


def build_dps(issuer, customer, amount, description, series, number, competence, now=None, substitution=None):
    errors = validate_data(issuer, customer, amount, description)
    if errors: raise DpsError(" | ".join(errors))
    now = now or datetime.now(ZoneInfo("America/Manaus"))
    root = etree.Element(f"{{{NS}}}DPS", nsmap={None: NS}, versao="1.01")
    info = node(root, "infDPS"); info.set("Id", dps_identifier(issuer, series, number))
    for name, value in [("tpAmb", "2"), ("dhEmi", now.isoformat(timespec="seconds")), ("verAplic", "Transcavalcante_1.0"), ("serie", str(int(series))), ("nDPS", str(int(number))), ("dCompet", competence), ("tpEmit", "1"), ("finNFSe", "0"), ("cLocEmi", digits(issuer["cityCode"]))]: node(info, name, value)
    if substitution:
        sub = node(info, "subst"); node(sub, "chSubstda", substitution["key"]); node(sub, "cMotivo", substitution["code"]); node(sub, "xMotivo", substitution["reason"])
    prest = node(info, "prest"); node(prest, "CNPJ", normalize_document(issuer["document"]))
    if issuer.get("sendMunicipalRegistration") == "Sim" and issuer.get("municipalRegistration"): node(prest, "IM", issuer["municipalRegistration"])
    regime = node(prest, "regTrib")
    simple = issuer.get("nationalSimpleRegime", "3" if issuer.get("simplesNacional") == "Sim" else "1")
    node(regime, "opSimpNac", simple)
    if simple == "3": node(regime, "regApTribSN", issuer.get("simpleTaxRegime", "1"))
    node(regime, "regEspTrib", issuer.get("specialTaxRegime", "0"))
    toma = node(info, "toma"); doc = normalize_document(customer["document"])
    node(toma, "CPF" if len(doc) == 11 else "CNPJ", doc); node(toma, "xNome", customer["name"])
    address(toma, customer)
    if customer.get("emailFiscal"): node(toma, "email", customer["emailFiscal"])
    service = node(info, "serv"); place = node(service, "locPrest"); node(place, "cLocPrestacao", digits(issuer["cityCode"]))
    code = node(service, "cServ"); node(code, "cTribNac", issuer["nationalServiceCode"])
    if issuer.get("municipalServiceCode"): node(code, "cTribMun", issuer["municipalServiceCode"])
    if issuer.get("nbs"): node(code, "cNBS", digits(issuer["nbs"]))
    node(code, "xDescServ", description)
    values = node(info, "valores"); service_value = node(values, "vServPrest"); node(service_value, "vServ", decimal_text(amount))
    tax = node(values, "trib"); municipal = node(tax, "tribMun")
    node(municipal, "tribISSQN", issuer.get("issTaxation", "1"))
    node(municipal, "tpRetISSQN", "2" if customer.get("issWithheld", issuer.get("issWithheldDefault")) == "Sim" else "1")
    if issuer.get("sendIssRate") == "Sim": node(municipal, "pAliq", decimal_text(customer.get("issRate") or issuer.get("issRate")))
    if issuer.get("sendFederalTaxes") == "Sim":
        federal = node(tax, "tribFed")
        if issuer.get("pisCofinsCst"):
            pc = node(federal, "piscofins"); node(pc, "CST", issuer["pisCofinsCst"])
            node(pc, "vBCPisCofins", decimal_text(amount))
            for name, key in [("pAliqPis", "pisRate"), ("pAliqCofins", "cofinsRate")]: node(pc, name, decimal_text(issuer.get(key) or 0))
            for name, key in [("vPis", "pisRate"), ("vCofins", "cofinsRate")]: node(pc, name, decimal_text(Decimal(str(amount)) * Decimal(decimal_text(issuer.get(key) or 0)) / 100))
            if issuer.get("pisCofinsRetention"): node(pc, "tpRetPisCofins", issuer["pisCofinsRetention"])
        if issuer.get("withheldSocialSecurityValue"): node(federal, "vRetCP", decimal_text(issuer["withheldSocialSecurityValue"]))
        for name, key in [("vRetIRRF", "irrfRate"), ("vRetCSLL", "csllRate")]:
            if Decimal(decimal_text(issuer.get(key) or 0)) > 0: node(federal, name, decimal_text(Decimal(str(amount)) * Decimal(decimal_text(issuer[key])) / 100))
    total = node(tax, "totTrib")
    if issuer.get("totalTaxSimplesRate"):
        node(total, "pTotTribSN", decimal_text(issuer["totalTaxSimplesRate"]))
    else: node(total, "indTotTrib", "0")
    if issuer.get("ibsCbsEnabled") == "Sim":
        ibs = node(info, "IBSCBS"); node(ibs, "indFinal", issuer.get("ibsCbsFinal", "0")); node(ibs, "cIndOp", issuer["ibsCbsOperation"]); node(ibs, "indDest", "0")
        trib = node(node(ibs, "valores"), "trib"); node(trib, "CST", issuer["ibsCbsCst"]); node(trib, "cClassTrib", issuer["ibsCbsClass"])
    validate_xml(root)
    return root


class NationalSigner(XMLSigner):
    def check_deprecated_methods(self):
        # National integrated manual documents RSA-SHA1; SHA256 is configurable for homologation.
        if settings.nfse_signature_algorithm != "rsa-sha1": super().check_deprecated_methods()


def sign_xml(root, key, cert):
    algorithm = settings.nfse_signature_algorithm
    signer = NationalSigner(method=methods.enveloped, signature_algorithm=algorithm, digest_algorithm="sha1" if algorithm == "rsa-sha1" else "sha256", c14n_algorithm="http://www.w3.org/TR/2001/REC-xml-c14n-20010315")
    reference = root[0].get("Id")
    signed = signer.sign(root, key=key, cert=cert.public_bytes(serialization.Encoding.PEM), reference_uri="#" + reference, id_attribute="Id")
    validate_xml(signed, "pedRegEvento_v1.01.xsd" if etree.QName(root).localname == "pedRegEvento" else "DPS_v1.01.xsd")
    return etree.tostring(signed, encoding="utf-8", xml_declaration=True).decode()


def build_cancel(issuer_document, access_key, reason, code="1"):
    if not re.fullmatch(r"[0-9]{50}", access_key): raise DpsError("Chave de acesso da NFS-e inválida.")
    if code not in {"1", "2", "9"} or not 15 <= len(reason.strip()) <= 255: raise DpsError("Informe código de cancelamento e justificativa entre 15 e 255 caracteres.")
    root = etree.Element(f"{{{NS}}}pedRegEvento", nsmap={None: NS}, versao="1.01")
    info = node(root, "infPedReg"); info.set("Id", "PRE" + access_key + "101101")
    for name, value in [("tpAmb", "2"), ("verAplic", "Transcavalcante_1.0"), ("dhEvento", datetime.now(ZoneInfo("America/Manaus")).isoformat(timespec="seconds")), ("CNPJAutor", issuer_document), ("chNFSe", access_key)]: node(info, name, value)
    event = node(info, "e101101"); node(event, "xDesc", "Cancelamento de NFS-e"); node(event, "cMotivo", code); node(event, "xMotivo", reason.strip())
    validate_xml(root, "pedRegEvento_v1.01.xsd")
    return root
