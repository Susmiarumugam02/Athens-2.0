"""
PTW Export Utilities
Comprehensive PDF and Excel export with audit-ready content
"""
from io import BytesIO
from datetime import datetime
from django.conf import settings
from django.utils import timezone
from django.db import models
from reportlab.lib.pagesizes import A4, letter
from reportlab.lib.units import inch
from reportlab.lib import colors
from reportlab.lib.styles import getSampleStyleSheet, ParagraphStyle
from reportlab.platypus import SimpleDocTemplate, Table, TableStyle, Paragraph, Spacer, PageBreak, Image
from reportlab.lib.enums import TA_CENTER, TA_LEFT, TA_RIGHT
import qrcode
import os


def _get_tenant_company_logo(permit, width=1*inch, height=0.8*inch):
    """Get the tenant company logo (Prozeal Green Energy Limited)"""
    try:
        # Look for a user with admin_type='master' or company_name containing 'Prozeal'
        from authentication.models import CustomUser
        
        # Try to find Prozeal/tenant admin user
        tenant_user = CustomUser.objects.filter(
            models.Q(admin_type='master') | 
            models.Q(company_name__icontains='Prozeal') |
            models.Q(company_name__icontains='Green Energy')
        ).first()
        
        if tenant_user:
            return _get_user_company_logo(tenant_user, width, height)
        
        # Fallback to project-based tenant logo if available
        if permit.project and hasattr(permit.project, 'tenant_logo'):
            logo_path = permit.project.tenant_logo.path
            if os.path.exists(logo_path):
                return Image(logo_path, width=width, height=height)
        
        return 'Prozeal Green Energy Limited'
        
    except Exception:
        return 'Prozeal Green Energy Limited'


def _get_user_company_logo(user, width=0.6*inch, height=0.4*inch):
    """Helper function to get company logo for a user"""
    if not user:
        return 'No user assigned'
    
    try:
        # Try AdminDetail first (more likely to have logos)
        if hasattr(user, 'admin_detail'):
            try:
                admin_detail = user.admin_detail
                if admin_detail and admin_detail.logo:
                    logo_path = admin_detail.logo.path
                    if os.path.exists(logo_path):
                        return Image(logo_path, width=width, height=height)
            except Exception:
                pass
        
        # Try CompanyDetail next
        if hasattr(user, 'company_detail'):
            try:
                company_detail = user.company_detail
                if company_detail and company_detail.company_logo:
                    logo_path = company_detail.company_logo.path
                    if os.path.exists(logo_path):
                        return Image(logo_path, width=width, height=height)
            except Exception:
                pass
        
        # Return company name as fallback
        company_name = getattr(user, 'company_name', '') or 'No logo available'
        return company_name
        
    except Exception:
        return 'Logo unavailable'


def generate_audit_ready_pdf(permit, buffer=None):
    """
    Generate comprehensive audit-ready PDF for a permit
    
    Args:
        permit: Permit instance
        buffer: BytesIO buffer (optional, creates new if None)
    
    Returns:
        BytesIO buffer with PDF content
    """
    if buffer is None:
        buffer = BytesIO()
    
    doc = SimpleDocTemplate(buffer, pagesize=A4, topMargin=0.5*inch, bottomMargin=0.5*inch)
    story = []
    styles = getSampleStyleSheet()
    
    # Custom styles
    title_style = ParagraphStyle(
        'CustomTitle',
        parent=styles['Heading1'],
        fontSize=16,
        textColor=colors.HexColor('#1890ff'),
        spaceAfter=12,
        alignment=TA_CENTER
    )
    
    heading_style = ParagraphStyle(
        'CustomHeading',
        parent=styles['Heading2'],
        fontSize=12,
        textColor=colors.HexColor('#262626'),
        spaceAfter=6,
        spaceBefore=12
    )
    
    # 1. Header with QR Code
    story.extend(_generate_header_section(permit, title_style, styles))
    
    # 2. People Section
    story.extend(_generate_people_section(permit, heading_style, styles))
    
    # 3. Workflow Timeline
    story.extend(_generate_workflow_timeline(permit, heading_style, styles))
    
    # 4. Safety Requirements
    story.extend(_generate_safety_section(permit, heading_style, styles))
    
    # 5. Gas Readings
    story.extend(_generate_gas_readings_section(permit, heading_style, styles))
    
    # 6. Isolation Register
    story.extend(_generate_isolation_section(permit, heading_style, styles))
    
    # 7. Closeout Checklist
    story.extend(_generate_closeout_section(permit, heading_style, styles))
    
    # 8. Signatures
    story.extend(_generate_signatures_section(permit, heading_style, styles))
    
    # 9. Attachments
    story.extend(_generate_attachments_section(permit, heading_style, styles))
    
    # 10. Audit Log
    story.extend(_generate_audit_log_section(permit, heading_style, styles))
    
    # Build PDF
    doc.build(story)
    buffer.seek(0)
    return buffer


def _generate_header_section(permit, title_style, styles):
    """Generate header with permit details, tenant company logo and QR code"""
    elements = []
    
    # Company Logo and Title Row - Use TENANT logo, not permit creator's logo
    header_data = []
    
    # Get tenant company logo (Prozeal Green Energy Limited)
    tenant_logo = _get_tenant_company_logo(permit, width=1*inch, height=0.8*inch)
    
    if isinstance(tenant_logo, Image):
        header_data.append([tenant_logo, Paragraph(f"PERMIT TO WORK - {permit.permit_number}", title_style)])
    else:
        # Fallback to text-only header if no logo available
        header_data.append(['', Paragraph(f"PERMIT TO WORK - {permit.permit_number}", title_style)])
    
    if header_data:
        header_table = Table(header_data, colWidths=[1.2*inch, 5.8*inch])
        header_table.setStyle(TableStyle([
            ('VALIGN', (0, 0), (-1, -1), 'MIDDLE'),
            ('LEFTPADDING', (0, 0), (0, 0), 0),
            ('RIGHTPADDING', (-1, 0), (-1, 0), 0),
        ]))
        elements.append(header_table)
    else:
        elements.append(Paragraph(f"PERMIT TO WORK - {permit.permit_number}", title_style))
    
    elements.append(Spacer(1, 0.2*inch))
    
    # QR Code
    try:
        frontend_url = getattr(settings, 'FRONTEND_BASE_URL', 'https://prozeal.athenas.co.in')
        qr_url = f"{frontend_url}/dashboard/ptw/view/{permit.id}"
        qr = qrcode.QRCode(version=1, box_size=3, border=1)
        qr.add_data(qr_url)
        qr.make(fit=True)
        qr_img = qr.make_image(fill_color="black", back_color="white")
        
        qr_buffer = BytesIO()
        qr_img.save(qr_buffer, format='PNG')
        qr_buffer.seek(0)
        
        qr_image = Image(qr_buffer, width=1*inch, height=1*inch)
        elements.append(qr_image)
        elements.append(Spacer(1, 0.1*inch))
    except Exception:
        pass  # Skip QR if generation fails
    
    # Permit details table
    data = [
        ['Permit Number:', permit.permit_number, 'Status:', permit.get_status_display()],
        ['Title:', permit.title or permit.description[:50], 'Priority:', permit.get_priority_display()],
        ['Type:', permit.permit_type.name, 'Category:', permit.permit_type.get_category_display()],
        ['Location:', permit.location, 'Project:', permit.project.name if permit.project else 'N/A'],
        ['Risk Level:', permit.get_risk_level_display(), 'Risk Score:', str(permit.risk_score)],
        ['Planned Start:', permit.planned_start_time.strftime('%Y-%m-%d %H:%M'), 
         'Planned End:', permit.planned_end_time.strftime('%Y-%m-%d %H:%M')],
    ]
    
    table = Table(data, colWidths=[1.5*inch, 2.5*inch, 1.5*inch, 2*inch])
    table.setStyle(TableStyle([
        ('FONTNAME', (0, 0), (0, -1), 'Helvetica-Bold'),
        ('FONTNAME', (2, 0), (2, -1), 'Helvetica-Bold'),
        ('FONTSIZE', (0, 0), (-1, -1), 9),
        ('GRID', (0, 0), (-1, -1), 0.5, colors.grey),
        ('VALIGN', (0, 0), (-1, -1), 'MIDDLE'),
        ('BACKGROUND', (0, 0), (0, -1), colors.HexColor('#f0f0f0')),
        ('BACKGROUND', (2, 0), (2, -1), colors.HexColor('#f0f0f0')),
    ]))
    
    elements.append(table)
    elements.append(Spacer(1, 0.2*inch))
    
    return elements


def _generate_people_section(permit, heading_style, styles):
    """Generate people/roles section with key personnel and their company logos"""
    elements = []
    elements.append(Paragraph("Personnel", heading_style))
    
    people_data = [['Role', 'Company Logo', 'Name', 'Department']]
    
    # Only include the three key roles
    personnel = [
        ('Requestor', permit.created_by),
        ('Verifier', permit.verifier),
        ('Approver', permit.approved_by)
    ]
    
    for role, user in personnel:
        if user:
            company_logo = _get_user_company_logo(user)
            
            people_data.append([
                role, 
                company_logo,
                f"{user.name} {user.surname}".strip(), 
                getattr(user, 'department', 'N/A')
            ])
    
    if len(people_data) > 1:
        table = Table(people_data, colWidths=[1*inch, 1*inch, 2.5*inch, 1.5*inch])
        table.setStyle(TableStyle([
            ('FONTNAME', (0, 0), (-1, 0), 'Helvetica-Bold'),
            ('FONTSIZE', (0, 0), (-1, -1), 9),
            ('GRID', (0, 0), (-1, -1), 0.5, colors.grey),
            ('BACKGROUND', (0, 0), (-1, 0), colors.HexColor('#e6f7ff')),
            ('VALIGN', (0, 0), (-1, -1), 'MIDDLE'),
            ('ALIGN', (1, 1), (1, -1), 'CENTER'),  # Center align company logos
        ]))
        elements.append(table)
        elements.append(Spacer(1, 0.15*inch))
    
    return elements


def _generate_workflow_timeline(permit, heading_style, styles):
    """Generate workflow timeline"""
    elements = []
    elements.append(Paragraph("Workflow Timeline", heading_style))
    
    timeline_data = [['Event', 'Timestamp']]
    
    if permit.created_at:
        timeline_data.append(['Created', permit.created_at.strftime('%Y-%m-%d %H:%M:%S')])
    if permit.submitted_at:
        timeline_data.append(['Submitted', permit.submitted_at.strftime('%Y-%m-%d %H:%M:%S')])
    if permit.verified_at:
        timeline_data.append(['Verified', permit.verified_at.strftime('%Y-%m-%d %H:%M:%S')])
    if permit.approved_at:
        timeline_data.append(['Approved', permit.approved_at.strftime('%Y-%m-%d %H:%M:%S')])
    if permit.actual_start_time:
        timeline_data.append(['Work Started', permit.actual_start_time.strftime('%Y-%m-%d %H:%M:%S')])
    if permit.actual_end_time:
        timeline_data.append(['Work Completed', permit.actual_end_time.strftime('%Y-%m-%d %H:%M:%S')])
    
    if len(timeline_data) > 1:
        table = Table(timeline_data, colWidths=[2*inch, 3*inch])
        table.setStyle(TableStyle([
            ('FONTNAME', (0, 0), (-1, 0), 'Helvetica-Bold'),
            ('FONTSIZE', (0, 0), (-1, -1), 9),
            ('GRID', (0, 0), (-1, -1), 0.5, colors.grey),
            ('BACKGROUND', (0, 0), (-1, 0), colors.HexColor('#e6f7ff')),
        ]))
        elements.append(table)
        elements.append(Spacer(1, 0.15*inch))
    
    return elements


def _generate_safety_section(permit, heading_style, styles):
    """Generate safety requirements section"""
    elements = []
    elements.append(Paragraph("Safety Requirements", heading_style))
    
    # PPE
    if permit.ppe_requirements:
        ppe_text = ", ".join(permit.ppe_requirements) if isinstance(permit.ppe_requirements, list) else str(permit.ppe_requirements)
        elements.append(Paragraph(f"<b>PPE Required:</b> {ppe_text}", styles['Normal']))
    
    # Control Measures
    if permit.control_measures:
        elements.append(Paragraph(f"<b>Control Measures:</b> {permit.control_measures}", styles['Normal']))
    
    elements.append(Spacer(1, 0.15*inch))
    return elements


def _generate_gas_readings_section(permit, heading_style, styles):
    """Generate gas readings table"""
    elements = []
    
    gas_readings = permit.gas_readings.all()
    if gas_readings.exists():
        elements.append(Paragraph("Gas Test Readings", heading_style))
        
        data = [['Gas Type', 'Reading', 'Unit', 'Status', 'Tested By', 'Tested At']]
        for reading in gas_readings:
            data.append([
                reading.get_gas_type_display(),
                str(reading.reading),
                reading.unit,
                reading.status.upper(),
                reading.tested_by.username if reading.tested_by else 'N/A',
                reading.tested_at.strftime('%Y-%m-%d %H:%M')
            ])
        
        table = Table(data, colWidths=[1.2*inch, 0.8*inch, 0.6*inch, 0.8*inch, 1.2*inch, 1.4*inch])
        table.setStyle(TableStyle([
            ('FONTNAME', (0, 0), (-1, 0), 'Helvetica-Bold'),
            ('FONTSIZE', (0, 0), (-1, -1), 8),
            ('GRID', (0, 0), (-1, -1), 0.5, colors.grey),
            ('BACKGROUND', (0, 0), (-1, 0), colors.HexColor('#e6f7ff')),
        ]))
        elements.append(table)
        elements.append(Spacer(1, 0.15*inch))
    
    return elements


def _generate_isolation_section(permit, heading_style, styles):
    """Generate isolation points register"""
    elements = []
    
    isolation_points = permit.isolation_points.all()
    if isolation_points.exists():
        elements.append(Paragraph("Isolation Points Register", heading_style))
        
        data = [['Point', 'Type', 'Energy', 'Locks', 'Isolated By/At', 'Verified By/At', 'Status']]
        for point in isolation_points:
            point_name = point.point.point_code if point.point else point.custom_point_name
            isolated_info = f"{point.isolated_by.username if point.isolated_by else 'N/A'} / {point.isolated_at.strftime('%Y-%m-%d %H:%M') if point.isolated_at else 'N/A'}"
            verified_info = f"{point.verified_by.username if point.verified_by else 'N/A'} / {point.verified_at.strftime('%Y-%m-%d %H:%M') if point.verified_at else 'N/A'}"
            
            data.append([
                point_name,
                point.point.get_point_type_display() if point.point else 'Custom',
                point.point.get_energy_type_display() if point.point else 'N/A',
                f"{point.lock_count} locks" if point.lock_applied else 'No locks',
                isolated_info,
                verified_info,
                point.get_status_display()
            ])
        
        table = Table(data, colWidths=[1*inch, 0.7*inch, 0.7*inch, 0.7*inch, 1.3*inch, 1.3*inch, 0.8*inch])
        table.setStyle(TableStyle([
            ('FONTNAME', (0, 0), (-1, 0), 'Helvetica-Bold'),
            ('FONTSIZE', (0, 0), (-1, -1), 7),
            ('GRID', (0, 0), (-1, -1), 0.5, colors.grey),
            ('BACKGROUND', (0, 0), (-1, 0), colors.HexColor('#e6f7ff')),
        ]))
        elements.append(table)
        elements.append(Spacer(1, 0.15*inch))
    
    return elements


def _generate_closeout_section(permit, heading_style, styles):
    """Generate closeout checklist"""
    elements = []
    
    try:
        closeout = permit.closeout
        if closeout and closeout.template:
            elements.append(Paragraph("Closeout Checklist", heading_style))
            
            data = [['Item', 'Required', 'Status', 'Completed By/At']]
            for item in closeout.template.items:
                key = item['key']
                status_info = closeout.checklist.get(key, {})
                done = status_info.get('done', False)
                completed_by = status_info.get('by', 'N/A')
                completed_at = status_info.get('at', 'N/A')
                
                data.append([
                    item['label'],
                    'Yes' if item.get('required', False) else 'No',
                    '✓' if done else '✗',
                    f"{completed_by} / {completed_at}"
                ])
            
            table = Table(data, colWidths=[3*inch, 0.8*inch, 0.8*inch, 2*inch])
            table.setStyle(TableStyle([
                ('FONTNAME', (0, 0), (-1, 0), 'Helvetica-Bold'),
                ('FONTSIZE', (0, 0), (-1, -1), 8),
                ('GRID', (0, 0), (-1, -1), 0.5, colors.grey),
                ('BACKGROUND', (0, 0), (-1, 0), colors.HexColor('#e6f7ff')),
            ]))
            elements.append(table)
            
            if closeout.completed:
                elements.append(Paragraph(
                    f"<b>Completed By:</b> {closeout.completed_by.username if closeout.completed_by else 'N/A'} "
                    f"on {closeout.completed_at.strftime('%Y-%m-%d %H:%M') if closeout.completed_at else 'N/A'}",
                    styles['Normal']
                ))
            
            elements.append(Spacer(1, 0.15*inch))
    except Exception:
        pass  # Skip if no closeout
    
    return elements


def _generate_signatures_section(permit, heading_style, styles):
    """Generate signatures section with company logos for requestor, verifier, and approver"""
    elements = []
    elements.append(Paragraph("Digital Signatures", heading_style))
    
    # Define the three signature types we want to display
    signature_types = [
        ('requestor', 'Requestor', permit.created_by),
        ('verifier', 'Verifier', permit.verifier), 
        ('approver', 'Approver', permit.approved_by)
    ]
    
    data = [['Type', 'Company Logo', 'Signatory', 'Signed At', 'Status']]
    
    for sig_type, label, fallback_user in signature_types:
        # Find signature by type
        signature = permit.signatures.filter(signature_type=sig_type).first()
        
        if signature:
            signatory_name = signature.signatory.get_full_name() if signature.signatory else 'Unknown'
            signed_at = signature.signed_at.strftime('%Y-%m-%d %H:%M:%S')
            status = 'Signed'
            user_for_logo = signature.signatory
        else:
            # Use fallback user info if no signature exists
            signatory_name = fallback_user.get_full_name() if fallback_user else 'Not assigned'
            signed_at = '—'
            status = 'Awaiting signature'
            user_for_logo = fallback_user
        
        # Get company logo for this user
        company_logo = _get_user_company_logo(user_for_logo)
        
        data.append([label, company_logo, signatory_name, signed_at, status])
    
    table = Table(data, colWidths=[1*inch, 1*inch, 1.8*inch, 1.5*inch, 1*inch])
    table.setStyle(TableStyle([
        ('FONTNAME', (0, 0), (-1, 0), 'Helvetica-Bold'),
        ('FONTSIZE', (0, 0), (-1, -1), 9),
        ('GRID', (0, 0), (-1, -1), 0.5, colors.grey),
        ('BACKGROUND', (0, 0), (-1, 0), colors.HexColor('#e6f7ff')),
        ('VALIGN', (0, 0), (-1, -1), 'MIDDLE'),
        ('ALIGN', (1, 1), (1, -1), 'CENTER'),  # Center align company logos
    ]))
    elements.append(table)
    elements.append(Spacer(1, 0.15*inch))
    
    return elements


def _generate_attachments_section(permit, heading_style, styles):
    """Generate attachments metadata"""
    elements = []
    elements.append(Paragraph("Attachments & Photos", heading_style))
    
    attachments = []
    
    # Document attachments
    if permit.work_procedure:
        attachments.append(f"Work Procedure: {permit.work_procedure.name}")
    if permit.method_statement:
        attachments.append(f"Method Statement: {permit.method_statement.name}")
    if permit.risk_assessment_doc:
        attachments.append(f"Risk Assessment: {permit.risk_assessment_doc.name}")
    if permit.isolation_certificate:
        attachments.append(f"Isolation Certificate: {permit.isolation_certificate.name}")
    if permit.site_layout:
        attachments.append(f"Site Layout: {permit.site_layout.name}")
    
    # Photos
    photos = permit.photos.all()
    for photo in photos:
        attachments.append(f"Photo ({photo.get_photo_type_display()}): Taken by {photo.taken_by.username if photo.taken_by else 'N/A'} at {photo.taken_at.strftime('%Y-%m-%d %H:%M')}")
    
    if attachments:
        for att in attachments:
            elements.append(Paragraph(f"• {att}", styles['Normal']))
    else:
        elements.append(Paragraph("No attachments", styles['Normal']))
    
    elements.append(Spacer(1, 0.15*inch))
    return elements


def _generate_audit_log_section(permit, heading_style, styles):
    """Generate audit log excerpt (last 20 actions)"""
    elements = []
    elements.append(Paragraph("Audit Log (Recent Actions)", heading_style))
    
    audit_logs = permit.audit_logs.all().order_by('-timestamp')[:20]
    
    if audit_logs.exists():
        data = [['Action', 'User', 'Timestamp', 'Comments']]
        for log in audit_logs:
            data.append([
                log.get_action_display(),
                log.user.username if log.user else 'System',
                log.timestamp.strftime('%Y-%m-%d %H:%M:%S'),
                (log.comments or '')[:50]
            ])
        
        table = Table(data, colWidths=[1.2*inch, 1.2*inch, 1.5*inch, 2.5*inch])
        table.setStyle(TableStyle([
            ('FONTNAME', (0, 0), (-1, 0), 'Helvetica-Bold'),
            ('FONTSIZE', (0, 0), (-1, -1), 7),
            ('GRID', (0, 0), (-1, -1), 0.5, colors.grey),
            ('BACKGROUND', (0, 0), (-1, 0), colors.HexColor('#e6f7ff')),
        ]))
        elements.append(table)
    else:
        elements.append(Paragraph("No audit logs available", styles['Normal']))
    
    elements.append(Spacer(1, 0.15*inch))
    return elements
