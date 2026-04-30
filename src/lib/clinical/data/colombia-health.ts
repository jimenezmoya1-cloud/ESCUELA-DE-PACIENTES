// Catálogos oficiales (SISPRO MSPS / SuperSalud) — fuente: insumos_construccion/Preventiva HC simplificada.xlsx

export const REGIMEN_AFILIACION: Array<{ code: string; label: string }> = [
  { code: "01", label: "01 Contributivo cotizante" },
  { code: "02", label: "02 Contributivo beneficiario" },
  { code: "03", label: "03 Contributivo adicional" },
  { code: "04", label: "04 Subsidiado" },
  { code: "05", label: "05 No afiliado" },
  { code: "06", label: "06 Especial o excepción cotizante" },
  { code: "07", label: "07 Especial o excepción beneficiario" },
  { code: "08", label: "08 Personas privadas de la libertad a cargo del fondo nacional de salud" },
  { code: "09", label: "09 Tomador/amparado ARL" },
  { code: "10", label: "10 Tomador/amparado SOAT" },
  { code: "11", label: "11 Tomador/amparado planes voluntarios de salud" },
  { code: "12", label: "12 Particular" },
  { code: "13", label: "13 Especial o excepción no cotizante" },
  { code: "14", label: "14 Población pobre no asegurada" },
  { code: "15", label: "15 INPEC" },
]

export interface EpsEntry {
  code: string
  name: string
  group: "Contributivo" | "Subsidiado" | "Excepción y Especial"
}

export const EPS_LIST: EpsEntry[] = [
  // Régimen contributivo
  { code: "EPS001", name: "ALIANSALUD EPS", group: "Contributivo" },
  { code: "EPS002", name: "SALUD TOTAL EPS S.A.", group: "Contributivo" },
  { code: "EPS005", name: "ENTIDAD PROMOTORA DE SALUD SANITAS S.A.S.", group: "Contributivo" },
  { code: "EPS010", name: "EPS SURAMERICANA S.A", group: "Contributivo" },
  { code: "EPS017", name: "EPS FAMISANAR S.A.S.", group: "Contributivo" },
  { code: "EPS018", name: "ENTIDAD PROMOTORA DE SALUD SERVICIO OCCIDENTAL DE SALUD S.A. S.O.S.", group: "Contributivo" },
  { code: "EPS012", name: "COMFENALCO VALLE", group: "Contributivo" },
  { code: "EPS008", name: "COMPENSAR EPS", group: "Contributivo" },
  { code: "EAS016", name: "COOMEVA ENTIDAD PROMOTORA DE SALUD S.A. \"COOMEVA E.P.S. S.A.\"", group: "Contributivo" },
  { code: "EAS027", name: "FONDO DE PASIVO SOCIAL DE FERROCARRILES NACIONALES DE COLOMBIA", group: "Contributivo" },
  { code: "EPS037", name: "NUEVA EPS S.A.", group: "Contributivo" },
  { code: "EPS042", name: "COOSALUD EPS S.A.", group: "Contributivo" },
  { code: "EPS044", name: "MEDIMAS EPS S.A.S", group: "Contributivo" },
  { code: "EPS046", name: "FUNDACIÓN SALUD MIA", group: "Contributivo" },
  { code: "EPS048", name: "MUTUAL SER EPS", group: "Contributivo" },
  // Régimen subsidiado
  { code: "CCF055", name: "CAJACOPI ATLANTICO", group: "Subsidiado" },
  { code: "EPS025", name: "CAPRESOCA E.P.S.", group: "Subsidiado" },
  { code: "CCF102", name: "COMFACHOCO", group: "Subsidiado" },
  { code: "CCF050", name: "COMFAORIENTE", group: "Subsidiado" },
  { code: "CCF033", name: "EPS FAMILIAR DE COLOMBIA", group: "Subsidiado" },
  { code: "ESS062", name: "ASMET SALUD", group: "Subsidiado" },
  { code: "ESS118", name: "EMSSANAR S.A.S", group: "Subsidiado" },
  { code: "EPSS34", name: "CAPITAL SALUD EPS-S S.A.S", group: "Subsidiado" },
  { code: "EPSS40", name: "SAVIA SALUD EPS", group: "Subsidiado" },
  { code: "EPSI01", name: "ASOCIACIÓN DE CABILDOS INDÍGENAS DEL CESAR Y GUAJIRA \"DUSAKAWI A.R.S.I.\"", group: "Subsidiado" },
  { code: "EPSI03", name: "ASOCIACIÓN INDÍGENA DEL CAUCA A.I.C. EPSI", group: "Subsidiado" },
  { code: "EPSI04", name: "EMPRESA PROMOTORA DE SALUD INDÍGENA ANAS WAYUU EPSI", group: "Subsidiado" },
  { code: "EPSI05", name: "ENTIDAD PROMOTORA DE SALUD MALLAMAS EPSI", group: "Subsidiado" },
  { code: "EPSI06", name: "PIJAOS SALUD EPSI", group: "Subsidiado" },
  { code: "EPS022", name: "ENTIDAD PROMOTORA DE SALUD DEL RÉGIMEN SUBSIDIADO EPS CONVID", group: "Subsidiado" },
  { code: "EPSS41", name: "NUEVA EPS S.A (Subsidiado)", group: "Subsidiado" },
  { code: "EPSS45", name: "MEDIMAS EPS S.A.S. (Subsidiado)", group: "Subsidiado" },
  { code: "ESS024", name: "COOSALUD EPS S.A. SBS", group: "Subsidiado" },
  { code: "ESS076", name: "ASOCIACIÓN MUTUAL BARRIOS UNIDOS DE QUIBDO AMBUQ EPS - S - ESS", group: "Subsidiado" },
  { code: "ESS091", name: "ECOOPSOS EPS SAS", group: "Subsidiado" },
  { code: "ESS133", name: "COMPARTA EPS-S", group: "Subsidiado" },
  { code: "ESS207", name: "MUTUAL SER EPS (Subsidiado)", group: "Subsidiado" },
  // Régimen de excepción y especial
  { code: "FMS001", name: "FUERZAS MILITARES", group: "Excepción y Especial" },
  { code: "POL001", name: "POLICIA NACIONAL", group: "Excepción y Especial" },
  { code: "RES002", name: "ECOPETROL", group: "Excepción y Especial" },
  { code: "RES004", name: "MAGISTERIO", group: "Excepción y Especial" },
  { code: "RES005", name: "UNIVERSIDAD DEL ATLANTICO", group: "Excepción y Especial" },
  { code: "RES006", name: "UNIVERSIDAD INDUSTRIAL DE SANTANDER", group: "Excepción y Especial" },
  { code: "RES007", name: "UNIVERSIDAD DEL VALLE", group: "Excepción y Especial" },
  { code: "RES008", name: "UNIVERSIDAD NACIONAL DE COLOMBIA", group: "Excepción y Especial" },
  { code: "RES009", name: "UNIVERSIDAD DEL CAUCA", group: "Excepción y Especial" },
  { code: "RES010", name: "UNIVERSIDAD DE CARTAGENA", group: "Excepción y Especial" },
  { code: "RES011", name: "UNIVERSIDAD DE ANTIOQUIA", group: "Excepción y Especial" },
  { code: "RES012", name: "UNIVERSIDAD DE CORDOBA", group: "Excepción y Especial" },
  { code: "RES013", name: "UNIVERSIDAD DE NARIÑO", group: "Excepción y Especial" },
  { code: "RES014", name: "UNIVERSIDAD PEDAGOGICA Y TECNOLOGICA DE COLOMBIA - UPTC", group: "Excepción y Especial" },
]

export const PREPAGADAS_LIST: Array<{ code: string; name: string }> = [
  { code: "EMP002", name: "MEDPLUS MEDICINA PREPAGADA S.A." },
  { code: "EMP015", name: "MEDISANITAS S.A.S COMPAÑÍA DE MEDICINA PREPAGADA" },
  { code: "EMP017", name: "COLMEDICA MEDICINA PREPAGADA S A" },
  { code: "EMP021", name: "MEDICINA PREPAGADA SURAMERICANA S.A." },
  { code: "EMP022", name: "VIVIR S.A" },
  { code: "EMP023", name: "COMPAÑÍA DE MEDICINA PREPAGADA COLSANITAS S.A." },
  { code: "EMP024", name: "SERVICIO DE SALUD INMEDIATO MEDICINA PREPAGADA S.A." },
  { code: "EMP025", name: "PLAN U.H.C.M. MEDICINA PREPAGADA COMFENALCO VALLE" },
  { code: "EMP028", name: "COOMEVA MEDICINA PREPAGADA S.A." },
  { code: "EMP029", name: "AXA COLPATRIA MEDICINA PREPAGADA S.A" },
  { code: "SAP026", name: "EMERMEDICA S.A SERVICIOS DE AMBULANCIA PREPAGADOS" },
]

export const PLAN_COMPLEMENTARIO_LIST: Array<{ code: string; name: string }> = [
  { code: "EPS008", name: "PLAN COMPLEMENTARIO COMPENSAR" },
  { code: "EPS017", name: "PLAN COMPLEMENTARIO FAMISANAR" },
  { code: "EPS005", name: "PLAN COMPLEMENTARIO SANITAS" },
  { code: "EPS018", name: "PLAN COMPLEMENTARIO SERVICIO OCCIDENTAL DE SALUD" },
  { code: "EPS010", name: "PLAN COMPLEMENTARIO SURAMERICANA" },
  { code: "EPS037", name: "PLAN COMPLEMENTARIO NUEVA EMPRESA PROMOTORA DE SALUD" },
  { code: "EPS002", name: "PLAN COMPLEMENTARIO SALUD TOTAL" },
]
