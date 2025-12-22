"""
Script per importar els establiments extrets del PDF
"""

import asyncio
import json
from import_establishments_v2 import import_establishment

# Dades extretes del PDF
establishments_data = [
  {
    "name": "RITUALS",
    "commercial_name": "Rituals",
    "address": "carrer Monterols, 34",
    "nif": "B64936610",
    "category": "Salut / Bellesa",
    "subcategory": "perfumeria bellesa",
    "phone": "+34666426866",
    "email": "reus@rituals.com",
    "facebook_url": "https://www.facebook.com/RitualsCosmeticsES/?brand_redir=153587372926",
    "instagram_url": "https://www.instagram.com/ritualscosmeticsspain/",
    "twitter_url": "https://twitter.com/rituals",
    "logo_url": "https://www.eltombdereus.com/uploads/2021/07/slider1-rituals1.jpg",
    "video_url": "https://www.youtube.com/user/ritualscosmetics",
    "external_id": "4115573250",
    "partner_id": "110741680"
  },
  {
    "name": "ROVIRA JOIERS",
    "commercial_name": "Rovira Joiers",
    "address": "carrer Llovera, 28",
    "nif": "B43688217",
    "category": "Llar / Regals",
    "subcategory": "joieria rellotgeria regals",
    "phone": "+34607142788",
    "email": "info@rovirafuste.com",
    "facebook_url": "https://www.facebook.com/RoviraJoiers/",
    "instagram_url": "https://www.instagram.com/rovira_joiers/",
    "logo_url": "https://www.eltombdereus.com/uploads/2021/07/20200409041214-slider1-rovira-joiers1.png",
    "external_id": "4115680410",
    "partner_id": "110631190"
  },
  {
    "name": "SABATERIA CASAS GIRONA",
    "commercial_name": "Sabateria Casas Girona",
    "address": "carrer de les Galanes, 4",
    "nif": "39843696Z",
    "category": "Moda",
    "subcategory": "moda",
    "phone": "+34606469606",
    "logo_url": "https://eltombdereus.com/uploads/2021/08/download-1.jpg",
    "external_id": "4115550360",
    "partner_id": "110925160"
  },
  {
    "name": "SAITAMA CAFÉ",
    "commercial_name": "Saitama Café",
    "address": "plaça Mercadal, 4",
    "nif": "B16718884",
    "category": "Hostelería",
    "subcategory": "restaurant hosteleria",
    "phone": "+34678910879",
    "email": "saitamabread@gmail.com",
    "instagram_url": "https://www.instagram.com/saitamacafereus",
    "logo_url": "https://s3-eu-west-1.amazonaws.com/duc.neuromobile.io/f7d277fa136dce2ea3e80697ca8e04c6739bdaba.jpg",
    "external_id": "4115507780",
    "partner_id": "110830736"
  },
  {
    "name": "SANTIPER DISSENY",
    "commercial_name": "Santiper Disseny",
    "address": "raval Santa Anna, 38",
    "nif": "B43202720",
    "category": "Moda",
    "subcategory": "moda dona",
    "phone": "+34653678642",
    "email": "central@santi-per.com",
    "instagram_url": "https://www.instagram.com/santiper_official/",
    "logo_url": "https://www.eltombdereus.com/uploads/2021/07/slider1-santiper-disseny1.jpg",
    "external_id": "4115678930",
    "partner_id": "110901340"
  },
  {
    "name": "SANTIPER HOME",
    "commercial_name": "Santiper Home",
    "address": "raval Santa Anna, 29",
    "nif": "B43202720",
    "category": "Moda",
    "subcategory": "moda home",
    "phone": "653678642",
    "email": "central@santi-per.com",
    "facebook_url": "https://www.facebook.com/SantiperHome/",
    "logo_url": "https://s3-eu-west-1.amazonaws.com/duc.neuromobile.io/de135026e48c1c1894827304ee26e0283379626e.jpg",
    "external_id": "4115662860",
    "partner_id": "110878830"
  },
  {
    "name": "SIBUYA",
    "commercial_name": "Sibuya",
    "address": "CC El Pallol",
    "nif": "A58069147",
    "category": "Hostelería",
    "subcategory": "restaurant hosteleria",
    "phone": "+34618788851",
    "email": "jtorres@nyn.es",
    "logo_url": "https://s3-eu-west-1.amazonaws.com/duc.neuromobile.io/79ca2b11e78990ede6411fdfc7b416040503d961.png",
    "external_id": "4115543824",
    "partner_id": "111026905"
  },
  {
    "name": "SIMORRA",
    "commercial_name": "Simorra",
    "address": "carrer Llovera, 45",
    "nif": "B43202720",
    "category": "Moda",
    "subcategory": "moda dona",
    "phone": "+34653683710",
    "email": "132-reus@javiersimorra.com",
    "logo_url": "https://s3-eu-west-1.amazonaws.com/duc.neuromobile.io/16a4c47ba276ad814a9bd2e75c192a660a6ad53c.png",
    "external_id": "4115720500",
    "partner_id": "110612470"
  },
  {
    "name": "SIMPLEMENT TU",
    "commercial_name": "Simplement Tu",
    "address": "carrer de les Galanes, 16",
    "nif": "17581076Z",
    "category": "Salut / Bellesa",
    "subcategory": "perruqueria bellesa",
    "phone": "+34625970506",
    "email": "simplementtuestetica@gmail.com",
    "instagram_url": "https://www.instagram.com/simplementtu_estetica",
    "logo_url": "https://s3-eu-west-1.amazonaws.com/duc.neuromobile.io/f0fc38611f9a010be106528dd401c50c5a0d3649.png",
    "external_id": "4115573237",
    "partner_id": "110971364"
  },
  {
    "name": "SMOOY",
    "commercial_name": "Smöoy",
    "address": "CC El Pallol",
    "category": "Hostelería",
    "subcategory": "gelats hosteleria",
    "phone": "+34611820947",
    "logo_url": "https://s3-eu-west-1.amazonaws.com/duc.neuromobile.io/0ae874cf31fe007f3b96786939bb4ee1f20df9c6.png",
    "external_id": "4115556740",
    "partner_id": "111127870"
  },
  {
    "name": "SOMSIS",
    "commercial_name": "Somsis",
    "address": "raval Santa Anna, 4",
    "nif": "B64743537",
    "category": "Moda",
    "subcategory": "moda dona",
    "phone": "+34620881950",
    "email": "somsis@somsis.com",
    "instagram_url": "https://www.instagram.com/somsismoda/?hl=es",
    "logo_url": "https://s3-eu-west-1.amazonaws.com/duc.neuromobile.io/a972ca73b3f4d995996646749bd2f1717cd9f0b7.png",
    "external_id": "4115621940",
    "partner_id": "110738200"
  },
  {
    "name": "SONY CENTER",
    "commercial_name": "Sony Center",
    "address": "avinguda Prat de la Riba, 5",
    "nif": "B43774975",
    "category": "Llar / Regals",
    "subcategory": "electrodomestics llar",
    "phone": "+34670298447",
    "email": "info@sonyexperience.es",
    "facebook_url": "https://www.facebook.com/sonyreuss/",
    "instagram_url": "https://www.instagram.com/sonyreus_/?hl=es",
    "twitter_url": "https://twitter.com/Sony_Reus",
    "logo_url": "https://www.eltombdereus.com/uploads/2021/07/slider1-sony-center1.jpg",
    "external_id": "4115770030",
    "partner_id": "110476860"
  },
  {
    "name": "STAR BURGER",
    "commercial_name": "Star Burger",
    "address": "carrer Santa Anna, 14",
    "nif": "J55595052",
    "category": "Hostelería",
    "subcategory": "restaurant hosteleria",
    "phone": "+34666313148",
    "email": "anaolgamc@gmail.com",
    "logo_url": "https://s3-eu-west-1.amazonaws.com/duc.neuromobile.io/ecc29e69e9259af0e14b0099e4e3e2cda2cb79f5.jpg",
    "external_id": "4115605250",
    "partner_id": "110925580"
  },
  {
    "name": "STIL",
    "commercial_name": "Stil",
    "address": "avinguda Prat de la Riba, 9",
    "nif": "B43635499",
    "category": "Moda",
    "subcategory": "moda intima",
    "phone": "+34636234536",
    "email": "ninin@stil.es",
    "website": "https://stil.es/",
    "instagram_url": "https://www.instagram.com/stil_reus/",
    "logo_url": "https://s3-eu-west-1.amazonaws.com/duc.neuromobile.io/8f70c4e70bde64e03af89bb36837728b637271c9.png",
    "external_id": "4115769610",
    "partner_id": "110446730"
  },
  {
    "name": "STORIE ITALIANE",
    "commercial_name": "Storie Italiane",
    "address": "carrer Llovera, 22",
    "nif": "B66444902",
    "category": "Moda",
    "subcategory": "moda dona",
    "phone": "+34635524675",
    "email": "info@storieitaliane.eu",
    "logo_url": "https://s3-eu-west-1.amazonaws.com/duc.neuromobile.io/9bc010cfe9e557fc98e58bbdaad14f425d3b3e7a.png",
    "external_id": "4115670550",
    "partner_id": "110634930"
  },
  {
    "name": "TAMARIS",
    "commercial_name": "Tamaris",
    "address": "carrer Llovera, 30",
    "nif": "B09723206",
    "category": "Moda",
    "subcategory": "sabateria moda",
    "phone": "+34690830415",
    "email": "dstilreus@gmail.com",
    "logo_url": "https://s3-eu-west-1.amazonaws.com/duc.neuromobile.io/1f736ec435b5e9a3aceb23382d9c1802c6bdd4f8.png",
    "external_id": "4115682410",
    "partner_id": "110627440"
  },
  {
    "name": "TASCÓN",
    "commercial_name": "Tascón Zapaterías",
    "address": "carrer Llovera, 14",
    "nif": "B09723206",
    "category": "Moda",
    "subcategory": "sabateria moda",
    "phone": "+34600655621",
    "email": "marina@tascon.es",
    "website": "https://tascon.es/",
    "facebook_url": "https://www.facebook.com/TASCONZAPATERIAS/",
    "instagram_url": "https://www.instagram.com/tasconbarcelona/",
    "logo_url": "https://s3-eu-west-1.amazonaws.com/duc.neuromobile.io/f566b4beb75685c618ba053bb8f543d3af32f1fe.png",
    "external_id": "4115662570",
    "partner_id": "110648040"
  },
  {
    "name": "TATTOO TRAGUS",
    "commercial_name": "Tattoo Tragus",
    "address": "carrer Santa Anna, 5",
    "nif": "39899141Y",
    "category": "Salut / Bellesa",
    "subcategory": "tatuatges bellesa",
    "phone": "+34681337475",
    "email": "tattootragus@hotmail.com",
    "facebook_url": "https://www.facebook.com/Tattoo-Tragus-226962110796589/?ref=br_rs",
    "instagram_url": "https://www.instagram.com/frankgalleratattooart/",
    "logo_url": "https://www.eltombdereus.com/uploads/2021/07/slider1-tattoo-tragus1.jpg",
    "external_id": "4115586060",
    "partner_id": "110956410"
  },
  {
    "name": "TEIXIDÓ",
    "commercial_name": "Òptiques Teixidó",
    "address": "raval Jesús, 35",
    "nif": "A43060680",
    "category": "Salut / Bellesa",
    "subcategory": "òptica salut",
    "phone": "+34666313148",
    "email": "info@opticateixido.com",
    "facebook_url": "https://www.facebook.com/opticateixido",
    "instagram_url": "https://www.instagram.com/opticateixido/",
    "twitter_url": "https://twitter.com/opticateixido",
    "logo_url": "https://www.eltombdereus.com/uploads/2021/08/169352984_4010650662326209_3528895666817295531_n.jpg",
    "external_id": "4115516650",
    "partner_id": "110702350"
  },
  {
    "name": "TEULA",
    "commercial_name": "Teula",
    "address": "raval Martí Folguera, 37",
    "nif": "B43124452",
    "category": "Moda",
    "subcategory": "pelleteria moda",
    "phone": "+34609791204",
    "email": "teula.reus@gmail.com",
    "logo_url": "https://www.eltombdereus.com/uploads/2021/07/slider1-teula1.jpg",
    "external_id": "4115294840",
    "partner_id": "110827210"
  },
  {
    "name": "THE LOTUS BISTRO",
    "commercial_name": "The Lotus Bistro",
    "address": "plaça de la Farinera, 9",
    "nif": "B10658565",
    "category": "Hostelería",
    "subcategory": "restaurant",
    "phone": "+34632208607",
    "email": "thelotusbistrovietnam@gmail.com",
    "instagram_url": "https://www.instagram.com/the.lotusbistro",
    "logo_url": "https://s3-eu-west-1.amazonaws.com/duc.neuromobile.io/d7d7b521bcb7312b17c8b3b257181c32e2ac16e0.png",
    "external_id": "4115607356",
    "partner_id": "110936379"
  },
  {
    "name": "TRASQUILON",
    "commercial_name": "Trasquilón Peluqueros",
    "address": "carrer Santa Teresa, 44",
    "nif": "B43774470",
    "category": "Salut / Bellesa",
    "subcategory": "perruqueria bellesa",
    "phone": "+34661859979",
    "email": "trasquilon@trasquilon.com",
    "website": "https://trasquilon.com/ca/",
    "facebook_url": "https://www.facebook.com/trasquilon.perruquers/",
    "instagram_url": "https://www.instagram.com/trasquilonperruquers/",
    "logo_url": "https://www.eltombdereus.com/uploads/2021/07/slider1-trasquilOn-perruquers1.jpg",
    "external_id": "4115721300",
    "partner_id": "110464520"
  },
  {
    "name": "VERMUTS ROFES",
    "commercial_name": "Vermuts Rofes",
    "address": "carrer Sant Vicenç, 21",
    "nif": "B55513881",
    "category": "Hostelería",
    "subcategory": "restaurant hosteleria",
    "phone": "+34619341571",
    "email": "vermuts-rofes@hotmail.com",
    "instagram_url": "https://www.instagram.com/restaurantvermutsrofes/",
    "logo_url": "https://s3-eu-west-1.amazonaws.com/duc.neuromobile.io/39479b15aa6b36ff8c766deea8c6c85dc9a14e2b.png",
    "external_id": "4115774690",
    "partner_id": "110739520"
  },
  {
    "name": "VIENA",
    "commercial_name": "Viena",
    "address": "plaça Prim, 4",
    "nif": "A08874489",
    "category": "Hostelería",
    "subcategory": "restaurant hosteleria",
    "phone": "+34649831074",
    "email": "viena@viena.es",
    "facebook_url": "https://www.facebook.com/VienaSocVienes",
    "instagram_url": "https://www.instagram.com/Vienasocvienes/",
    "logo_url": "https://www.eltombdereus.com/uploads/2021/08/4218544335_96b7bb146c_b.jpg",
    "external_id": "4115626210",
    "partner_id": "110648980"
  },
  {
    "name": "VITALDENT",
    "commercial_name": "Vitaldent",
    "address": "avinguda Prat de la Riba, 13-15",
    "nif": "B86399334",
    "category": "Salut / Bellesa",
    "subcategory": "centre salut dental",
    "phone": "+34649474468",
    "email": "director.reus1@vitaldent.com",
    "instagram_url": "https://www.instagram.com/vitaldent_es/",
    "twitter_url": "https://twitter.com/vitaldent_es",
    "logo_url": "https://www.eltombdereus.com/uploads/2021/08/vitaldent-centro-728.jpg",
    "video_url": "https://www.youtube.com/user/vitaldentespaña",
    "external_id": "4115763160",
    "partner_id": "110406460"
  },
  {
    "name": "VIU L'ECOLÒGIC",
    "commercial_name": "Viu l'Ecològic",
    "address": "avinguda Prat de la Riba, 45",
    "nif": "B55575559",
    "category": "Alimentació",
    "subcategory": "supermercat alimentació",
    "phone": "+34676758829",
    "email": "hola@viulecologic.cat",
    "website": "https://www.viulecologic.cat",
    "instagram_url": "https://www.instagram.com/viulecologic",
    "logo_url": "https://s3-eu-west-1.amazonaws.com/duc.neuromobile.io/27647e115f1d8d2b7b98a2652f35ef5dabf7e182.png",
    "external_id": "4115735814",
    "partner_id": "110188059"
  },
  {
    "name": "VIVENDEX",
    "commercial_name": "Vivendex",
    "address": "carrer Ample, 28",
    "nif": "B55753073",
    "category": "Serveis",
    "subcategory": "immobiliària serveis",
    "phone": "+34605899545",
    "email": "b.galindo@vivendex.com",
    "instagram_url": "https://www.instagram.com/vivendexreus/",
    "twitter_url": "https://twitter.com/vivendex",
    "logo_url": "https://www.eltombdereus.com/uploads/2023/05/facana-1.jpg",
    "video_url": "https://www.youtube.com/user/vivendex",
    "external_id": "4115867150",
    "partner_id": "110417700"
  },
  {
    "name": "XAROL URBAN",
    "commercial_name": "Xarol Urban",
    "address": "carrer Llovera, 56",
    "nif": "B55643241",
    "category": "Moda",
    "subcategory": "moda dona",
    "phone": "+34689222702",
    "email": "xarol@xarol.cat",
    "website": "https://xarol.cat/",
    "facebook_url": "https://www.facebook.com/xarolreus/",
    "logo_url": "https://www.eltombdereus.com/uploads/2021/07/slider1-xarol-urban1.jpg",
    "external_id": "4115741502",
    "partner_id": "110570953"
  },
  {
    "name": "XIVARRI TASCA",
    "commercial_name": "Xivarri Tasca Reus",
    "address": "carrer Pubill Oriol, 7",
    "nif": "B55606693",
    "category": "Hostelería",
    "subcategory": "restaurant hosteleria",
    "phone": "+34622225186",
    "email": "xivarrigastronomia@gmail.com",
    "facebook_url": "https://www.facebook.com/xivarritascareustgn/?ref=page_internal&locale=es_ES",
    "instagram_url": "https://www.instagram.com/xivarri_tascareus/",
    "twitter_url": "https://twitter.com/xivarritasca",
    "logo_url": "https://www.eltombdereus.com/uploads/2021/07/20210409105513-slider1-xivarri-tasca1.png",
    "external_id": "4115493540",
    "partner_id": "110755720"
  },
  {
    "name": "ZERO GLUTEN SISTARÉ",
    "commercial_name": "Zero Gluten Sistaré",
    "address": "carrer Josep Sardà i Cailà, s/n - Mercat Central",
    "nif": "B43365030",
    "category": "Alimentació",
    "subcategory": "forn alimentació",
    "phone": "+34620260244",
    "email": "comunicacio@fornsistare.com",
    "logo_url": "https://s3-eu-west-1.amazonaws.com/duc.neuromobile.io/b07b986d388500837732f58869b8ecb4053bc5e9.jpg",
    "external_id": "4115710545",
    "partner_id": "110320429"
  }
]

async def main():
    print(f"🚀 Iniciant importació de {len(establishments_data)} establiments des del PDF...")
    print()
    
    for idx, est_data in enumerate(establishments_data, 1):
        print(f"[{idx}/{len(establishments_data)}] Processant '{est_data.get('name')}'...")
        await import_establishment(est_data)
        print()
    
    print("✅ Importació completada!")
    
    # Mostrar estadístiques
    from motor.motor_asyncio import AsyncIOMotorClient
    import os
    from dotenv import load_dotenv
    
    load_dotenv()
    client = AsyncIOMotorClient(os.getenv('MONGO_URL'))
    db = client[os.getenv('DB_NAME', 'tomb_reus_db')]
    
    total = await db.establishments.count_documents({})
    with_nif = await db.establishments.count_documents({"nif": {"$ne": None, "$exists": True}})
    with_logo = await db.establishments.count_documents({"image_url": {"$ne": None, "$exists": True}})
    
    print(f"\n📊 ESTADÍSTIQUES FINALS:")
    print(f"   Total establiments: {total}")
    print(f"   Amb NIF: {with_nif}")
    print(f"   Amb logo: {with_logo}")
    
    client.close()

if __name__ == "__main__":
    asyncio.run(main())
