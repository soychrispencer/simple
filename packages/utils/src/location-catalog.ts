export type CatalogRegion = {
    id: string;
    name: string;
    code?: string;
};

export type CatalogCommune = {
    id: string;
    regionId: string;
    name: string;
};

export const LOCATION_REGIONS: CatalogRegion[] = [
    {
        id: "cl-15",
        name: "Arica y Parinacota",
        code: "15"
    },
    {
        id: "cl-01",
        name: "Tarapacá",
        code: "1"
    },
    {
        id: "cl-02",
        name: "Antofagasta",
        code: "2"
    },
    {
        id: "cl-03",
        name: "Atacama",
        code: "3"
    },
    {
        id: "cl-04",
        name: "Coquimbo",
        code: "4"
    },
    {
        id: "cl-05",
        name: "Valparaíso",
        code: "5"
    },
    {
        id: "cl-13",
        name: "Región Metropolitana",
        code: "13"
    },
    {
        id: "cl-06",
        name: "O'Higgins",
        code: "6"
    },
    {
        id: "cl-07",
        name: "Maule",
        code: "7"
    },
    {
        id: "cl-16",
        name: "Ñuble",
        code: "16"
    },
    {
        id: "cl-08",
        name: "Biobío",
        code: "8"
    },
    {
        id: "cl-09",
        name: "Araucanía",
        code: "9"
    },
    {
        id: "cl-14",
        name: "Los Ríos",
        code: "14"
    },
    {
        id: "cl-10",
        name: "Los Lagos",
        code: "10"
    },
    {
        id: "cl-11",
        name: "Aysén",
        code: "11"
    },
    {
        id: "cl-12",
        name: "Magallanes y Antártica Chilena",
        code: "12"
    }
];

export const LOCATION_COMMUNES: CatalogCommune[] = [
    {
        id: "ari-arica",
        regionId: "cl-15",
        name: "Arica"
    },
    {
        id: "ari-camarones",
        regionId: "cl-15",
        name: "Camarones"
    },
    {
        id: "ari-general-lagos",
        regionId: "cl-15",
        name: "General Lagos"
    },
    {
        id: "ari-putre",
        regionId: "cl-15",
        name: "Putre"
    },
    {
        id: "tar-alto-hospicio",
        regionId: "cl-01",
        name: "Alto Hospicio"
    },
    {
        id: "tar-camina",
        regionId: "cl-01",
        name: "Camiña"
    },
    {
        id: "tar-colchane",
        regionId: "cl-01",
        name: "Colchane"
    },
    {
        id: "tar-huara",
        regionId: "cl-01",
        name: "Huara"
    },
    {
        id: "tar-iquique",
        regionId: "cl-01",
        name: "Iquique"
    },
    {
        id: "tar-pica",
        regionId: "cl-01",
        name: "Pica"
    },
    {
        id: "tar-pozo-almonte",
        regionId: "cl-01",
        name: "Pozo Almonte"
    },
    {
        id: "ant-antofagasta",
        regionId: "cl-02",
        name: "Antofagasta"
    },
    {
        id: "ant-calama",
        regionId: "cl-02",
        name: "Calama"
    },
    {
        id: "ant-maria-elena",
        regionId: "cl-02",
        name: "María Elena"
    },
    {
        id: "ant-mejillones",
        regionId: "cl-02",
        name: "Mejillones"
    },
    {
        id: "ant-ollague",
        regionId: "cl-02",
        name: "Ollagüe"
    },
    {
        id: "ant-san-pedro-de-atacama",
        regionId: "cl-02",
        name: "San Pedro de Atacama"
    },
    {
        id: "ant-sierra-gorda",
        regionId: "cl-02",
        name: "Sierra Gorda"
    },
    {
        id: "ant-taltal",
        regionId: "cl-02",
        name: "Taltal"
    },
    {
        id: "ant-tocopilla",
        regionId: "cl-02",
        name: "Tocopilla"
    },
    {
        id: "ata-alto-del-carmen",
        regionId: "cl-03",
        name: "Alto del Carmen"
    },
    {
        id: "ata-caldera",
        regionId: "cl-03",
        name: "Caldera"
    },
    {
        id: "ata-chanaral",
        regionId: "cl-03",
        name: "Chañaral"
    },
    {
        id: "ata-copiapo",
        regionId: "cl-03",
        name: "Copiapó"
    },
    {
        id: "ata-diego-de-almagro",
        regionId: "cl-03",
        name: "Diego de Almagro"
    },
    {
        id: "ata-freirina",
        regionId: "cl-03",
        name: "Freirina"
    },
    {
        id: "ata-huasco",
        regionId: "cl-03",
        name: "Huasco"
    },
    {
        id: "ata-tierra-amarilla",
        regionId: "cl-03",
        name: "Tierra Amarilla"
    },
    {
        id: "ata-vallenar",
        regionId: "cl-03",
        name: "Vallenar"
    },
    {
        id: "coq-andacollo",
        regionId: "cl-04",
        name: "Andacollo"
    },
    {
        id: "coq-canela",
        regionId: "cl-04",
        name: "Canela"
    },
    {
        id: "coq-combarbala",
        regionId: "cl-04",
        name: "Combarbalá"
    },
    {
        id: "coq-coquimbo",
        regionId: "cl-04",
        name: "Coquimbo"
    },
    {
        id: "coq-illapel",
        regionId: "cl-04",
        name: "Illapel"
    },
    {
        id: "coq-la-higuera",
        regionId: "cl-04",
        name: "La Higuera"
    },
    {
        id: "coq-la-serena",
        regionId: "cl-04",
        name: "La Serena"
    },
    {
        id: "coq-los-vilos",
        regionId: "cl-04",
        name: "Los Vilos"
    },
    {
        id: "coq-monte-patria",
        regionId: "cl-04",
        name: "Monte Patria"
    },
    {
        id: "coq-ovalle",
        regionId: "cl-04",
        name: "Ovalle"
    },
    {
        id: "coq-paiguano",
        regionId: "cl-04",
        name: "Paiguano"
    },
    {
        id: "coq-punitaqui",
        regionId: "cl-04",
        name: "Punitaqui"
    },
    {
        id: "coq-rio-hurtado",
        regionId: "cl-04",
        name: "Río Hurtado"
    },
    {
        id: "coq-salamanca",
        regionId: "cl-04",
        name: "Salamanca"
    },
    {
        id: "coq-vicuna",
        regionId: "cl-04",
        name: "Vicuña"
    },
    {
        id: "v-algarrobo",
        regionId: "cl-05",
        name: "Algarrobo"
    },
    {
        id: "v-cabildo",
        regionId: "cl-05",
        name: "Cabildo"
    },
    {
        id: "v-calle-larga",
        regionId: "cl-05",
        name: "Calle Larga"
    },
    {
        id: "v-cartagena",
        regionId: "cl-05",
        name: "Cartagena"
    },
    {
        id: "v-casablanca",
        regionId: "cl-05",
        name: "Casablanca"
    },
    {
        id: "v-catemu",
        regionId: "cl-05",
        name: "Catemu"
    },
    {
        id: "v-concon",
        regionId: "cl-05",
        name: "Concón"
    },
    {
        id: "v-el-quisco",
        regionId: "cl-05",
        name: "El Quisco"
    },
    {
        id: "v-el-tabo",
        regionId: "cl-05",
        name: "El Tabo"
    },
    {
        id: "v-hijuelas",
        regionId: "cl-05",
        name: "Hijuelas"
    },
    {
        id: "v-isla-de-pascua",
        regionId: "cl-05",
        name: "Isla de Pascua"
    },
    {
        id: "v-juan-fernandez",
        regionId: "cl-05",
        name: "Juan Fernández"
    },
    {
        id: "v-la-calera",
        regionId: "cl-05",
        name: "La Calera"
    },
    {
        id: "v-la-cruz",
        regionId: "cl-05",
        name: "La Cruz"
    },
    {
        id: "v-la-ligua",
        regionId: "cl-05",
        name: "La Ligua"
    },
    {
        id: "v-limache",
        regionId: "cl-05",
        name: "Limache"
    },
    {
        id: "v-llay-llay",
        regionId: "cl-05",
        name: "Llay-Llay"
    },
    {
        id: "v-los-andes",
        regionId: "cl-05",
        name: "Los Andes"
    },
    {
        id: "v-nogales",
        regionId: "cl-05",
        name: "Nogales"
    },
    {
        id: "v-olmue",
        regionId: "cl-05",
        name: "Olmué"
    },
    {
        id: "v-panquehue",
        regionId: "cl-05",
        name: "Panquehue"
    },
    {
        id: "v-papudo",
        regionId: "cl-05",
        name: "Papudo"
    },
    {
        id: "v-petorca",
        regionId: "cl-05",
        name: "Petorca"
    },
    {
        id: "v-puchuncavi",
        regionId: "cl-05",
        name: "Puchuncaví"
    },
    {
        id: "v-putaendo",
        regionId: "cl-05",
        name: "Putaendo"
    },
    {
        id: "v-quillota",
        regionId: "cl-05",
        name: "Quillota"
    },
    {
        id: "v-quilpue",
        regionId: "cl-05",
        name: "Quilpué"
    },
    {
        id: "v-quintero",
        regionId: "cl-05",
        name: "Quintero"
    },
    {
        id: "v-rinconada",
        regionId: "cl-05",
        name: "Rinconada"
    },
    {
        id: "v-san-antonio",
        regionId: "cl-05",
        name: "San Antonio"
    },
    {
        id: "v-san-esteban",
        regionId: "cl-05",
        name: "San Esteban"
    },
    {
        id: "v-san-felipe",
        regionId: "cl-05",
        name: "San Felipe"
    },
    {
        id: "v-santa-maria",
        regionId: "cl-05",
        name: "Santa María"
    },
    {
        id: "v-santo-domingo",
        regionId: "cl-05",
        name: "Santo Domingo"
    },
    {
        id: "v-valparaiso",
        regionId: "cl-05",
        name: "Valparaíso"
    },
    {
        id: "v-villa-alemana",
        regionId: "cl-05",
        name: "Villa Alemana"
    },
    {
        id: "v-vina-del-mar",
        regionId: "cl-05",
        name: "Viña del Mar"
    },
    {
        id: "v-zapallar",
        regionId: "cl-05",
        name: "Zapallar"
    },
    {
        id: "rm-alhue",
        regionId: "cl-13",
        name: "Alhué"
    },
    {
        id: "rm-buin",
        regionId: "cl-13",
        name: "Buin"
    },
    {
        id: "rm-calera-de-tango",
        regionId: "cl-13",
        name: "Calera de Tango"
    },
    {
        id: "rm-cerrillos",
        regionId: "cl-13",
        name: "Cerrillos"
    },
    {
        id: "rm-cerro-navia",
        regionId: "cl-13",
        name: "Cerro Navia"
    },
    {
        id: "rm-colina",
        regionId: "cl-13",
        name: "Colina"
    },
    {
        id: "rm-conchali",
        regionId: "cl-13",
        name: "Conchalí"
    },
    {
        id: "rm-curacavi",
        regionId: "cl-13",
        name: "Curacaví"
    },
    {
        id: "rm-el-bosque",
        regionId: "cl-13",
        name: "El Bosque"
    },
    {
        id: "rm-el-monte",
        regionId: "cl-13",
        name: "El Monte"
    },
    {
        id: "rm-estacion-central",
        regionId: "cl-13",
        name: "Estación Central"
    },
    {
        id: "rm-huechuraba",
        regionId: "cl-13",
        name: "Huechuraba"
    },
    {
        id: "rm-independencia",
        regionId: "cl-13",
        name: "Independencia"
    },
    {
        id: "rm-isla-de-maipo",
        regionId: "cl-13",
        name: "Isla de Maipo"
    },
    {
        id: "rm-la-cisterna",
        regionId: "cl-13",
        name: "La Cisterna"
    },
    {
        id: "rm-la-florida",
        regionId: "cl-13",
        name: "La Florida"
    },
    {
        id: "rm-la-granja",
        regionId: "cl-13",
        name: "La Granja"
    },
    {
        id: "rm-la-pintana",
        regionId: "cl-13",
        name: "La Pintana"
    },
    {
        id: "rm-la-reina",
        regionId: "cl-13",
        name: "La Reina"
    },
    {
        id: "rm-lampa",
        regionId: "cl-13",
        name: "Lampa"
    },
    {
        id: "rm-las-condes",
        regionId: "cl-13",
        name: "Las Condes"
    },
    {
        id: "rm-lo-barnechea",
        regionId: "cl-13",
        name: "Lo Barnechea"
    },
    {
        id: "rm-lo-espejo",
        regionId: "cl-13",
        name: "Lo Espejo"
    },
    {
        id: "rm-lo-prado",
        regionId: "cl-13",
        name: "Lo Prado"
    },
    {
        id: "rm-macul",
        regionId: "cl-13",
        name: "Macul"
    },
    {
        id: "rm-maipu",
        regionId: "cl-13",
        name: "Maipú"
    },
    {
        id: "rm-maria-pinto",
        regionId: "cl-13",
        name: "María Pinto"
    },
    {
        id: "rm-melipilla",
        regionId: "cl-13",
        name: "Melipilla"
    },
    {
        id: "rm-nunoa",
        regionId: "cl-13",
        name: "Ñuñoa"
    },
    {
        id: "rm-padre-hurtado",
        regionId: "cl-13",
        name: "Padre Hurtado"
    },
    {
        id: "rm-paine",
        regionId: "cl-13",
        name: "Paine"
    },
    {
        id: "rm-pedro-aguirre-cerda",
        regionId: "cl-13",
        name: "Pedro Aguirre Cerda"
    },
    {
        id: "rm-penaflor",
        regionId: "cl-13",
        name: "Peñaflor"
    },
    {
        id: "rm-penalolen",
        regionId: "cl-13",
        name: "Peñalolén"
    },
    {
        id: "rm-pirque",
        regionId: "cl-13",
        name: "Pirque"
    },
    {
        id: "rm-providencia",
        regionId: "cl-13",
        name: "Providencia"
    },
    {
        id: "rm-pudahuel",
        regionId: "cl-13",
        name: "Pudahuel"
    },
    {
        id: "rm-puente-alto",
        regionId: "cl-13",
        name: "Puente Alto"
    },
    {
        id: "rm-quilicura",
        regionId: "cl-13",
        name: "Quilicura"
    },
    {
        id: "rm-quinta-normal",
        regionId: "cl-13",
        name: "Quinta Normal"
    },
    {
        id: "rm-recoleta",
        regionId: "cl-13",
        name: "Recoleta"
    },
    {
        id: "rm-renca",
        regionId: "cl-13",
        name: "Renca"
    },
    {
        id: "rm-san-bernardo",
        regionId: "cl-13",
        name: "San Bernardo"
    },
    {
        id: "rm-san-joaquin",
        regionId: "cl-13",
        name: "San Joaquín"
    },
    {
        id: "rm-san-jose-de-maipo",
        regionId: "cl-13",
        name: "San José de Maipo"
    },
    {
        id: "rm-san-miguel",
        regionId: "cl-13",
        name: "San Miguel"
    },
    {
        id: "rm-san-pedro",
        regionId: "cl-13",
        name: "San Pedro"
    },
    {
        id: "rm-san-ramon",
        regionId: "cl-13",
        name: "San Ramón"
    },
    {
        id: "rm-santiago",
        regionId: "cl-13",
        name: "Santiago"
    },
    {
        id: "rm-talagante",
        regionId: "cl-13",
        name: "Talagante"
    },
    {
        id: "rm-tiltil",
        regionId: "cl-13",
        name: "Tiltil"
    },
    {
        id: "rm-vitacura",
        regionId: "cl-13",
        name: "Vitacura"
    },
    {
        id: "ohi-chepica",
        regionId: "cl-06",
        name: "Chépica"
    },
    {
        id: "ohi-chimbarongo",
        regionId: "cl-06",
        name: "Chimbarongo"
    },
    {
        id: "ohi-codegua",
        regionId: "cl-06",
        name: "Codegua"
    },
    {
        id: "ohi-coinco",
        regionId: "cl-06",
        name: "Coinco"
    },
    {
        id: "ohi-coltauco",
        regionId: "cl-06",
        name: "Coltauco"
    },
    {
        id: "ohi-donihue",
        regionId: "cl-06",
        name: "Doñihue"
    },
    {
        id: "ohi-graneros",
        regionId: "cl-06",
        name: "Graneros"
    },
    {
        id: "ohi-la-estrella",
        regionId: "cl-06",
        name: "La Estrella"
    },
    {
        id: "ohi-las-cabras",
        regionId: "cl-06",
        name: "Las Cabras"
    },
    {
        id: "ohi-litueche",
        regionId: "cl-06",
        name: "Litueche"
    },
    {
        id: "ohi-lolol",
        regionId: "cl-06",
        name: "Lolol"
    },
    {
        id: "ohi-machali",
        regionId: "cl-06",
        name: "Machalí"
    },
    {
        id: "ohi-malloa",
        regionId: "cl-06",
        name: "Malloa"
    },
    {
        id: "ohi-marchihue",
        regionId: "cl-06",
        name: "Marchihue"
    },
    {
        id: "ohi-mostazal",
        regionId: "cl-06",
        name: "Mostazal"
    },
    {
        id: "ohi-nancagua",
        regionId: "cl-06",
        name: "Nancagua"
    },
    {
        id: "ohi-navidad",
        regionId: "cl-06",
        name: "Navidad"
    },
    {
        id: "ohi-olivar",
        regionId: "cl-06",
        name: "Olivar"
    },
    {
        id: "ohi-palmilla",
        regionId: "cl-06",
        name: "Palmilla"
    },
    {
        id: "ohi-paredones",
        regionId: "cl-06",
        name: "Paredones"
    },
    {
        id: "ohi-peralillo",
        regionId: "cl-06",
        name: "Peralillo"
    },
    {
        id: "ohi-peumo",
        regionId: "cl-06",
        name: "Peumo"
    },
    {
        id: "ohi-pichidegua",
        regionId: "cl-06",
        name: "Pichidegua"
    },
    {
        id: "ohi-pichilemu",
        regionId: "cl-06",
        name: "Pichilemu"
    },
    {
        id: "ohi-placilla",
        regionId: "cl-06",
        name: "Placilla"
    },
    {
        id: "ohi-pumanque",
        regionId: "cl-06",
        name: "Pumanque"
    },
    {
        id: "ohi-quinta-de-tilcoco",
        regionId: "cl-06",
        name: "Quinta de Tilcoco"
    },
    {
        id: "ohi-rancagua",
        regionId: "cl-06",
        name: "Rancagua"
    },
    {
        id: "ohi-rengo",
        regionId: "cl-06",
        name: "Rengo"
    },
    {
        id: "ohi-requinoa",
        regionId: "cl-06",
        name: "Requínoa"
    },
    {
        id: "ohi-san-fernando",
        regionId: "cl-06",
        name: "San Fernando"
    },
    {
        id: "ohi-san-vicente",
        regionId: "cl-06",
        name: "San Vicente"
    },
    {
        id: "ohi-santa-cruz",
        regionId: "cl-06",
        name: "Santa Cruz"
    },
    {
        id: "mau-cauquenes",
        regionId: "cl-07",
        name: "Cauquenes"
    },
    {
        id: "mau-chanco",
        regionId: "cl-07",
        name: "Chanco"
    },
    {
        id: "mau-colbun",
        regionId: "cl-07",
        name: "Colbún"
    },
    {
        id: "mau-constitucion",
        regionId: "cl-07",
        name: "Constitución"
    },
    {
        id: "mau-curepto",
        regionId: "cl-07",
        name: "Curepto"
    },
    {
        id: "mau-curico",
        regionId: "cl-07",
        name: "Curicó"
    },
    {
        id: "mau-empedrado",
        regionId: "cl-07",
        name: "Empedrado"
    },
    {
        id: "mau-hualane",
        regionId: "cl-07",
        name: "Hualañé"
    },
    {
        id: "mau-licanten",
        regionId: "cl-07",
        name: "Licantén"
    },
    {
        id: "mau-linares",
        regionId: "cl-07",
        name: "Linares"
    },
    {
        id: "mau-longavi",
        regionId: "cl-07",
        name: "Longaví"
    },
    {
        id: "mau-maule",
        regionId: "cl-07",
        name: "Maule"
    },
    {
        id: "mau-molina",
        regionId: "cl-07",
        name: "Molina"
    },
    {
        id: "mau-parral",
        regionId: "cl-07",
        name: "Parral"
    },
    {
        id: "mau-pelarco",
        regionId: "cl-07",
        name: "Pelarco"
    },
    {
        id: "mau-pelluhue",
        regionId: "cl-07",
        name: "Pelluhue"
    },
    {
        id: "mau-pencahue",
        regionId: "cl-07",
        name: "Pencahue"
    },
    {
        id: "mau-rauco",
        regionId: "cl-07",
        name: "Rauco"
    },
    {
        id: "mau-retiro",
        regionId: "cl-07",
        name: "Retiro"
    },
    {
        id: "mau-rio-claro",
        regionId: "cl-07",
        name: "Río Claro"
    },
    {
        id: "mau-romeral",
        regionId: "cl-07",
        name: "Romeral"
    },
    {
        id: "mau-sagrada-familia",
        regionId: "cl-07",
        name: "Sagrada Familia"
    },
    {
        id: "mau-san-clemente",
        regionId: "cl-07",
        name: "San Clemente"
    },
    {
        id: "mau-san-javier",
        regionId: "cl-07",
        name: "San Javier"
    },
    {
        id: "mau-san-rafael",
        regionId: "cl-07",
        name: "San Rafael"
    },
    {
        id: "mau-talca",
        regionId: "cl-07",
        name: "Talca"
    },
    {
        id: "mau-teno",
        regionId: "cl-07",
        name: "Teno"
    },
    {
        id: "mau-vichuquen",
        regionId: "cl-07",
        name: "Vichuquén"
    },
    {
        id: "mau-villa-alegre",
        regionId: "cl-07",
        name: "Villa Alegre"
    },
    {
        id: "mau-yerbas-buenas",
        regionId: "cl-07",
        name: "Yerbas Buenas"
    },
    {
        id: "nub-bulnes",
        regionId: "cl-16",
        name: "Bulnes"
    },
    {
        id: "nub-chillan",
        regionId: "cl-16",
        name: "Chillán"
    },
    {
        id: "nub-chillan-viejo",
        regionId: "cl-16",
        name: "Chillán Viejo"
    },
    {
        id: "nub-cobquecura",
        regionId: "cl-16",
        name: "Cobquecura"
    },
    {
        id: "nub-coelemu",
        regionId: "cl-16",
        name: "Coelemu"
    },
    {
        id: "nub-coihueco",
        regionId: "cl-16",
        name: "Coihueco"
    },
    {
        id: "nub-el-carmen",
        regionId: "cl-16",
        name: "El Carmen"
    },
    {
        id: "nub-ninhue",
        regionId: "cl-16",
        name: "Ninhue"
    },
    {
        id: "nub-niquen",
        regionId: "cl-16",
        name: "Niquen"
    },
    {
        id: "nub-pemuco",
        regionId: "cl-16",
        name: "Pemuco"
    },
    {
        id: "nub-pinto",
        regionId: "cl-16",
        name: "Pinto"
    },
    {
        id: "nub-portezuelo",
        regionId: "cl-16",
        name: "Portezuelo"
    },
    {
        id: "nub-quillon",
        regionId: "cl-16",
        name: "Quillón"
    },
    {
        id: "nub-quirihue",
        regionId: "cl-16",
        name: "Quirihue"
    },
    {
        id: "nub-ranquil",
        regionId: "cl-16",
        name: "Ránquil"
    },
    {
        id: "nub-san-carlos",
        regionId: "cl-16",
        name: "San Carlos"
    },
    {
        id: "nub-san-fabian",
        regionId: "cl-16",
        name: "San Fabián"
    },
    {
        id: "nub-san-ignacio",
        regionId: "cl-16",
        name: "San Ignacio"
    },
    {
        id: "nub-san-nicolas",
        regionId: "cl-16",
        name: "San Nicolás"
    },
    {
        id: "nub-treguaco",
        regionId: "cl-16",
        name: "Treguaco"
    },
    {
        id: "nub-yungay",
        regionId: "cl-16",
        name: "Yungay"
    },
    {
        id: "bio-alto-biobio",
        regionId: "cl-08",
        name: "Alto Biobío"
    },
    {
        id: "bio-antuco",
        regionId: "cl-08",
        name: "Antuco"
    },
    {
        id: "bio-arauco",
        regionId: "cl-08",
        name: "Arauco"
    },
    {
        id: "bio-cabrero",
        regionId: "cl-08",
        name: "Cabrero"
    },
    {
        id: "bio-canete",
        regionId: "cl-08",
        name: "Cañete"
    },
    {
        id: "bio-chiguayante",
        regionId: "cl-08",
        name: "Chiguayante"
    },
    {
        id: "bio-concepcion",
        regionId: "cl-08",
        name: "Concepción"
    },
    {
        id: "bio-contulmo",
        regionId: "cl-08",
        name: "Contulmo"
    },
    {
        id: "bio-coronel",
        regionId: "cl-08",
        name: "Coronel"
    },
    {
        id: "bio-curanilahue",
        regionId: "cl-08",
        name: "Curanilahue"
    },
    {
        id: "bio-florida",
        regionId: "cl-08",
        name: "Florida"
    },
    {
        id: "bio-hualpen",
        regionId: "cl-08",
        name: "Hualpén"
    },
    {
        id: "bio-hualqui",
        regionId: "cl-08",
        name: "Hualqui"
    },
    {
        id: "bio-laja",
        regionId: "cl-08",
        name: "Laja"
    },
    {
        id: "bio-lebu",
        regionId: "cl-08",
        name: "Lebu"
    },
    {
        id: "bio-los-alamos",
        regionId: "cl-08",
        name: "Los Álamos"
    },
    {
        id: "bio-los-angeles",
        regionId: "cl-08",
        name: "Los Ángeles"
    },
    {
        id: "bio-lota",
        regionId: "cl-08",
        name: "Lota"
    },
    {
        id: "bio-mulchen",
        regionId: "cl-08",
        name: "Mulchén"
    },
    {
        id: "bio-nacimiento",
        regionId: "cl-08",
        name: "Nacimiento"
    },
    {
        id: "bio-negrete",
        regionId: "cl-08",
        name: "Negrete"
    },
    {
        id: "bio-penco",
        regionId: "cl-08",
        name: "Penco"
    },
    {
        id: "bio-quilaco",
        regionId: "cl-08",
        name: "Quilaco"
    },
    {
        id: "bio-quilleco",
        regionId: "cl-08",
        name: "Quilleco"
    },
    {
        id: "bio-san-pedro-de-la-paz",
        regionId: "cl-08",
        name: "San Pedro de la Paz"
    },
    {
        id: "bio-san-rosendo",
        regionId: "cl-08",
        name: "San Rosendo"
    },
    {
        id: "bio-santa-barbara",
        regionId: "cl-08",
        name: "Santa Bárbara"
    },
    {
        id: "bio-santa-juana",
        regionId: "cl-08",
        name: "Santa Juana"
    },
    {
        id: "bio-talcahuano",
        regionId: "cl-08",
        name: "Talcahuano"
    },
    {
        id: "bio-tirua",
        regionId: "cl-08",
        name: "Tirúa"
    },
    {
        id: "bio-tome",
        regionId: "cl-08",
        name: "Tomé"
    },
    {
        id: "bio-tucapel",
        regionId: "cl-08",
        name: "Tucapel"
    },
    {
        id: "bio-yumbel",
        regionId: "cl-08",
        name: "Yumbel"
    },
    {
        id: "ara-angol",
        regionId: "cl-09",
        name: "Angol"
    },
    {
        id: "ara-carahue",
        regionId: "cl-09",
        name: "Carahue"
    },
    {
        id: "ara-cholchol",
        regionId: "cl-09",
        name: "Cholchol"
    },
    {
        id: "ara-collipulli",
        regionId: "cl-09",
        name: "Collipulli"
    },
    {
        id: "ara-cunco",
        regionId: "cl-09",
        name: "Cunco"
    },
    {
        id: "ara-curacautin",
        regionId: "cl-09",
        name: "Curacautín"
    },
    {
        id: "ara-curarrehue",
        regionId: "cl-09",
        name: "Curarrehue"
    },
    {
        id: "ara-ercilla",
        regionId: "cl-09",
        name: "Ercilla"
    },
    {
        id: "ara-freire",
        regionId: "cl-09",
        name: "Freire"
    },
    {
        id: "ara-galvarino",
        regionId: "cl-09",
        name: "Galvarino"
    },
    {
        id: "ara-gorbea",
        regionId: "cl-09",
        name: "Gorbea"
    },
    {
        id: "ara-lautaro",
        regionId: "cl-09",
        name: "Lautaro"
    },
    {
        id: "ara-loncoche",
        regionId: "cl-09",
        name: "Loncoche"
    },
    {
        id: "ara-lonquimay",
        regionId: "cl-09",
        name: "Lonquimay"
    },
    {
        id: "ara-los-sauces",
        regionId: "cl-09",
        name: "Los Sauces"
    },
    {
        id: "ara-lumaco",
        regionId: "cl-09",
        name: "Lumaco"
    },
    {
        id: "ara-melipeuco",
        regionId: "cl-09",
        name: "Melipeuco"
    },
    {
        id: "ara-nueva-imperial",
        regionId: "cl-09",
        name: "Nueva Imperial"
    },
    {
        id: "ara-padre-las-casas",
        regionId: "cl-09",
        name: "Padre las Casas"
    },
    {
        id: "ara-perquenco",
        regionId: "cl-09",
        name: "Perquenco"
    },
    {
        id: "ara-pitrufquen",
        regionId: "cl-09",
        name: "Pitrufquén"
    },
    {
        id: "ara-pucon",
        regionId: "cl-09",
        name: "Pucón"
    },
    {
        id: "ara-puren",
        regionId: "cl-09",
        name: "Purén"
    },
    {
        id: "ara-renaico",
        regionId: "cl-09",
        name: "Renaico"
    },
    {
        id: "ara-saavedra",
        regionId: "cl-09",
        name: "Saavedra"
    },
    {
        id: "ara-temuco",
        regionId: "cl-09",
        name: "Temuco"
    },
    {
        id: "ara-teodoro-schmidt",
        regionId: "cl-09",
        name: "Teodoro Schmidt"
    },
    {
        id: "ara-tolten",
        regionId: "cl-09",
        name: "Toltén"
    },
    {
        id: "ara-traiguen",
        regionId: "cl-09",
        name: "Traiguén"
    },
    {
        id: "ara-victoria",
        regionId: "cl-09",
        name: "Victoria"
    },
    {
        id: "ara-vilcun",
        regionId: "cl-09",
        name: "Vilcún"
    },
    {
        id: "ara-villarrica",
        regionId: "cl-09",
        name: "Villarrica"
    },
    {
        id: "rio-corral",
        regionId: "cl-14",
        name: "Corral"
    },
    {
        id: "rio-futrono",
        regionId: "cl-14",
        name: "Futrono"
    },
    {
        id: "rio-la-union",
        regionId: "cl-14",
        name: "La Unión"
    },
    {
        id: "rio-lago-ranco",
        regionId: "cl-14",
        name: "Lago Ranco"
    },
    {
        id: "rio-lanco",
        regionId: "cl-14",
        name: "Lanco"
    },
    {
        id: "rio-los-lagos",
        regionId: "cl-14",
        name: "Los Lagos"
    },
    {
        id: "rio-mafil",
        regionId: "cl-14",
        name: "Máfil"
    },
    {
        id: "rio-mariquina",
        regionId: "cl-14",
        name: "Mariquina"
    },
    {
        id: "rio-paillaco",
        regionId: "cl-14",
        name: "Paillaco"
    },
    {
        id: "rio-panguipulli",
        regionId: "cl-14",
        name: "Panguipulli"
    },
    {
        id: "rio-rio-bueno",
        regionId: "cl-14",
        name: "Río Bueno"
    },
    {
        id: "rio-valdivia",
        regionId: "cl-14",
        name: "Valdivia"
    },
    {
        id: "ll-ancud",
        regionId: "cl-10",
        name: "Ancud"
    },
    {
        id: "ll-calbuco",
        regionId: "cl-10",
        name: "Calbuco"
    },
    {
        id: "ll-castro",
        regionId: "cl-10",
        name: "Castro"
    },
    {
        id: "ll-chaiten",
        regionId: "cl-10",
        name: "Chaitén"
    },
    {
        id: "ll-chonchi",
        regionId: "cl-10",
        name: "Chonchi"
    },
    {
        id: "ll-cochamo",
        regionId: "cl-10",
        name: "Cochamó"
    },
    {
        id: "ll-curaco-de-velez",
        regionId: "cl-10",
        name: "Curaco de Vélez"
    },
    {
        id: "ll-dalcahue",
        regionId: "cl-10",
        name: "Dalcahue"
    },
    {
        id: "ll-fresia",
        regionId: "cl-10",
        name: "Fresia"
    },
    {
        id: "ll-frutillar",
        regionId: "cl-10",
        name: "Frutillar"
    },
    {
        id: "ll-futaleufu",
        regionId: "cl-10",
        name: "Futaleufú"
    },
    {
        id: "ll-hualaihue",
        regionId: "cl-10",
        name: "Hualaihué"
    },
    {
        id: "ll-llanquihue",
        regionId: "cl-10",
        name: "Llanquihue"
    },
    {
        id: "ll-los-muermos",
        regionId: "cl-10",
        name: "Los Muermos"
    },
    {
        id: "ll-maullin",
        regionId: "cl-10",
        name: "Maullín"
    },
    {
        id: "ll-osorno",
        regionId: "cl-10",
        name: "Osorno"
    },
    {
        id: "ll-palena",
        regionId: "cl-10",
        name: "Palena"
    },
    {
        id: "ll-puerto-montt",
        regionId: "cl-10",
        name: "Puerto Montt"
    },
    {
        id: "ll-puerto-octay",
        regionId: "cl-10",
        name: "Puerto Octay"
    },
    {
        id: "ll-puerto-varas",
        regionId: "cl-10",
        name: "Puerto Varas"
    },
    {
        id: "ll-puqueldon",
        regionId: "cl-10",
        name: "Puqueldón"
    },
    {
        id: "ll-purranque",
        regionId: "cl-10",
        name: "Purranque"
    },
    {
        id: "ll-puyehue",
        regionId: "cl-10",
        name: "Puyehue"
    },
    {
        id: "ll-queilen",
        regionId: "cl-10",
        name: "Queilén"
    },
    {
        id: "ll-quellon",
        regionId: "cl-10",
        name: "Quellón"
    },
    {
        id: "ll-quemchi",
        regionId: "cl-10",
        name: "Quemchi"
    },
    {
        id: "ll-quinchao",
        regionId: "cl-10",
        name: "Quinchao"
    },
    {
        id: "ll-rio-negro",
        regionId: "cl-10",
        name: "Río Negro"
    },
    {
        id: "ll-san-juan-de-la-costa",
        regionId: "cl-10",
        name: "San Juan de la Costa"
    },
    {
        id: "ll-san-pablo",
        regionId: "cl-10",
        name: "San Pablo"
    },
    {
        id: "ays-aysen",
        regionId: "cl-11",
        name: "Aysén"
    },
    {
        id: "ays-chile-chico",
        regionId: "cl-11",
        name: "Chile Chico"
    },
    {
        id: "ays-cisnes",
        regionId: "cl-11",
        name: "Cisnes"
    },
    {
        id: "ays-cochrane",
        regionId: "cl-11",
        name: "Cochrane"
    },
    {
        id: "ays-coyhaique",
        regionId: "cl-11",
        name: "Coyhaique"
    },
    {
        id: "ays-guaitecas",
        regionId: "cl-11",
        name: "Guaitecas"
    },
    {
        id: "ays-lago-verde",
        regionId: "cl-11",
        name: "Lago Verde"
    },
    {
        id: "ays-o-higgins",
        regionId: "cl-11",
        name: "O'Higgins"
    },
    {
        id: "ays-rio-ibanez",
        regionId: "cl-11",
        name: "Río Ibáñez"
    },
    {
        id: "ays-tortel",
        regionId: "cl-11",
        name: "Tortel"
    },
    {
        id: "mag-antartica",
        regionId: "cl-12",
        name: "Antártica"
    },
    {
        id: "mag-cabo-de-hornos",
        regionId: "cl-12",
        name: "Cabo de Hornos"
    },
    {
        id: "mag-laguna-blanca",
        regionId: "cl-12",
        name: "Laguna Blanca"
    },
    {
        id: "mag-natales",
        regionId: "cl-12",
        name: "Natales"
    },
    {
        id: "mag-porvenir",
        regionId: "cl-12",
        name: "Porvenir"
    },
    {
        id: "mag-primavera",
        regionId: "cl-12",
        name: "Primavera"
    },
    {
        id: "mag-punta-arenas",
        regionId: "cl-12",
        name: "Punta Arenas"
    },
    {
        id: "mag-rio-verde",
        regionId: "cl-12",
        name: "Río Verde"
    },
    {
        id: "mag-san-gregorio",
        regionId: "cl-12",
        name: "San Gregorio"
    },
    {
        id: "mag-timaukel",
        regionId: "cl-12",
        name: "Timaukel"
    },
    {
        id: "mag-torres-del-paine",
        regionId: "cl-12",
        name: "Torres del Paine"
    }
];

export function getCommunesForRegion(regionId: string): CatalogCommune[] {
    if (!regionId) return [];
    return LOCATION_COMMUNES
        .filter((commune) => commune.regionId === regionId)
        .sort((a, b) => a.name.localeCompare(b.name, 'es'));
}

export function getRegionById(regionId: string | null | undefined): CatalogRegion | undefined {
    if (!regionId) return undefined;
    return LOCATION_REGIONS.find((region) => region.id === regionId);
}

export function getCommuneById(communeId: string | null | undefined): CatalogCommune | undefined {
    if (!communeId) return undefined;
    return LOCATION_COMMUNES.find((commune) => commune.id === communeId);
}

export function resolveLocationNames(regionId: string | null | undefined, communeId: string | null | undefined) {
    return {
        regionName: getRegionById(regionId)?.name ?? null,
        communeName: getCommuneById(communeId)?.name ?? null,
    };
}

