#!/usr/bin/env python3
"""
Script per generar un PDF amb tots els locals d'hosteleria
"""
import os
from pymongo import MongoClient
from dotenv import load_dotenv
from reportlab.lib.pagesizes import A4
from reportlab.lib import colors
from reportlab.lib.styles import getSampleStyleSheet, ParagraphStyle
from reportlab.lib.units import cm
from reportlab.platypus import SimpleDocTemplate, Table, TableStyle, Paragraph, Spacer, PageBreak
from reportlab.lib.enums import TA_CENTER, TA_LEFT
from datetime import datetime

load_dotenv()

# Connexió a MongoDB
MONGO_URL = os.getenv('MONGO_URL', 'mongodb://localhost:27017')
client = MongoClient(MONGO_URL)
db = client['tomb_reus_db']

# Obtenir tots els establiments d'hosteleria
establiments = list(db.establishments.find({'category': 'Hostelería'}).sort('name', 1))

print(f"📊 Trobats {len(establiments)} establiments d'hosteleria")

# Crear PDF
output_file = '/app/locals_hosteleria.pdf'
doc = SimpleDocTemplate(output_file, pagesize=A4,
                       rightMargin=2*cm, leftMargin=2*cm,
                       topMargin=2*cm, bottomMargin=2*cm)

# Estils
styles = getSampleStyleSheet()
title_style = ParagraphStyle(
    'CustomTitle',
    parent=styles['Heading1'],
    fontSize=24,
    textColor=colors.HexColor('#4CAF50'),
    spaceAfter=30,
    alignment=TA_CENTER,
    fontName='Helvetica-Bold'
)

subtitle_style = ParagraphStyle(
    'CustomSubtitle',
    parent=styles['Normal'],
    fontSize=12,
    textColor=colors.grey,
    spaceAfter=20,
    alignment=TA_CENTER
)

heading_style = ParagraphStyle(
    'CustomHeading',
    parent=styles['Heading2'],
    fontSize=14,
    textColor=colors.HexColor('#4CAF50'),
    spaceAfter=10,
    fontName='Helvetica-Bold'
)

# Elements del document
elements = []

# Títol
elements.append(Paragraph("REUS COMERÇ i FUTUR", title_style))
elements.append(Paragraph(f"Directori d'Establiments d'Hosteleria", subtitle_style))
elements.append(Paragraph(f"Total: {len(establiments)} locals", subtitle_style))
elements.append(Paragraph(f"Data: {datetime.now().strftime('%d/%m/%Y')}", subtitle_style))
elements.append(Spacer(1, 1*cm))

# Crear taula amb la informació
for i, est in enumerate(establiments, 1):
    # Nom de l'establiment
    elements.append(Paragraph(f"<b>{i}. {est.get('name', 'Sense nom')}</b>", heading_style))
    
    # Dades de l'establiment
    data = []
    
    if est.get('address'):
        data.append(['Adreça:', est['address']])
    
    if est.get('phone'):
        data.append(['Telèfon:', est['phone']])
    
    if est.get('email'):
        data.append(['Email:', est['email']])
    
    if est.get('website'):
        data.append(['Web:', est['website']])
    
    if est.get('opening_hours'):
        data.append(['Horari:', est['opening_hours']])
    
    if est.get('description'):
        desc = est['description'][:200] + '...' if len(est['description']) > 200 else est['description']
        data.append(['Descripció:', desc])
    
    if data:
        table = Table(data, colWidths=[4*cm, 13*cm])
        table.setStyle(TableStyle([
            ('FONTNAME', (0, 0), (0, -1), 'Helvetica-Bold'),
            ('FONTNAME', (1, 0), (1, -1), 'Helvetica'),
            ('FONTSIZE', (0, 0), (-1, -1), 10),
            ('TEXTCOLOR', (0, 0), (0, -1), colors.HexColor('#757575')),
            ('VALIGN', (0, 0), (-1, -1), 'TOP'),
            ('LEFTPADDING', (0, 0), (-1, -1), 0),
            ('RIGHTPADDING', (0, 0), (-1, -1), 0),
            ('TOPPADDING', (0, 0), (-1, -1), 2),
            ('BOTTOMPADDING', (0, 0), (-1, -1), 2),
        ]))
        elements.append(table)
    
    elements.append(Spacer(1, 0.5*cm))
    
    # Línia separadora cada 3 establiments
    if i % 3 == 0 and i < len(establiments):
        elements.append(Spacer(1, 0.3*cm))

# Generar el PDF
doc.build(elements)

print(f"✅ PDF generat correctament: {output_file}")
print(f"📄 {len(establiments)} establiments inclosos")

client.close()
