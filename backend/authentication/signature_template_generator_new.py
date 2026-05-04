import os
import io
from datetime import datetime
from PIL import Image, ImageDraw, ImageFont, ImageChops
from django.core.files.base import ContentFile
from django.conf import settings
import logging

logger = logging.getLogger(__name__)

class SignatureTemplateGenerator:
    def __init__(self, logo_opacity=0.5):
        # Compact canvas size for reduced whitespace
        self.template_width = 450
        self.template_height = 100
        self.logo_max_width = 120
        self.logo_max_height = 70
        self.logo_opacity = logo_opacity  # Configurable logo transparency (0.0 to 1.0)
        self.last_logo_source = None
        self.last_logo_path = None
        
        # Layout zones with tighter spacing
        self.left_zone_x = 12
        self.center_zone_x = self.template_width // 2  # Horizontally centered
        self.right_zone_x = self.template_width // 2 + 18  # Right zone closer to divider
        self.divider_x = self.template_width // 2  # Vertical divider position

    def resolve_company_logo(self, user):
        """Resolve company logo with deterministic fallback chain - prioritize master company logo for consistency."""
        from .models import CustomUser

        self.last_logo_source = None
        self.last_logo_path = None

        def _set_logo(logo_file, source):
            self.last_logo_source = source
            self.last_logo_path = getattr(logo_file, 'path', None)
            return logo_file, self.last_logo_source, self.last_logo_path

        # PRIORITY 1: Master admin company logo (for consistency across all signatures)
        try:
            master_admin = CustomUser.objects.filter(admin_type__in=['master', 'masteradmin']).first()
            if master_admin:
                master_company = getattr(master_admin, 'company_detail', None)
                if master_company and master_company.company_logo:
                    logger.info("Using master CompanyDetail logo for user %s", user.id)
                    return _set_logo(master_company.company_logo, 'master_company_detail')
        except Exception as e:
            logger.exception("Error resolving master logo for user %s: %s", user.id, e)

        # PRIORITY 2: CompanyDetail.company_logo (user's company)
        try:
            company_detail = getattr(user, 'company_detail', None)
            if company_detail and company_detail.company_logo:
                logger.info("Using CompanyDetail logo for user %s", user.id)
                return _set_logo(company_detail.company_logo, 'company_detail')
        except Exception as e:
            logger.exception("Error resolving CompanyDetail logo for user %s: %s", user.id, e)

        # PRIORITY 3: AdminDetail.logo (admin logo)
        try:
            admin_detail = getattr(user, 'admin_detail', None)
            if admin_detail and admin_detail.logo:
                logger.info("Using AdminDetail logo for user %s", user.id)
                return _set_logo(admin_detail.logo, 'admin_detail')
        except Exception as e:
            logger.exception("Error resolving AdminDetail logo for user %s: %s", user.id, e)

        # PRIORITY 4: Parent company logo / inherited parent company logo
        try:
            parent = getattr(user, 'created_by', None)
            if parent:
                parent_company = getattr(parent, 'company_detail', None)
                if parent_company and parent_company.company_logo:
                    logger.info("Using parent CompanyDetail logo for user %s", user.id)
                    return _set_logo(parent_company.company_logo, 'parent_company_detail')
                parent_admin = getattr(parent, 'admin_detail', None)
                if parent_admin and parent_admin.logo:
                    logger.info("Using parent AdminDetail logo for user %s", user.id)
                    return _set_logo(parent_admin.logo, 'parent_admin_detail')
        except Exception as e:
            logger.exception("Error resolving parent logo for user %s: %s", user.id, e)

        # PRIORITY 5: Fallback default logo file (if present)
        default_paths = [
            os.getenv('DEFAULT_COMPANY_LOGO_PATH'),
            os.path.join(str(settings.MEDIA_ROOT), 'default_company_logo.png'),
            os.path.join(str(settings.BASE_DIR), 'static', 'media', 'default_company_logo.png'),
            os.path.join(str(settings.BASE_DIR), 'static', 'default_company_logo.png'),
        ]
        for path in default_paths:
            if path and os.path.exists(path):
                self.last_logo_source = 'fallback_default'
                self.last_logo_path = path
                logger.info("Using fallback company logo for user %s from %s", user.id, path)
                return None, self.last_logo_source, self.last_logo_path

        logger.warning(
            "No company logo resolved for user %s (type: %s, admin_type: %s)",
            user.id,
            getattr(user, 'user_type', 'N/A'),
            getattr(user, 'admin_type', 'N/A')
        )
        return None, None, None
    
    def _get_company_name(self, user):
        """Get company name from user's project"""
        try:
            if hasattr(user, 'project') and user.project:
                return user.project.name
        except Exception as e:
            logger.exception("Error getting company name for user %s: %s", user.id, e)
        return None

    def _resolve_full_name(self, user, detail):
        first_name = (getattr(user, 'name', None) or getattr(detail, 'name', None) or '').strip()
        last_name = (getattr(user, 'surname', None) or '').strip()
        full_name = f"{first_name} {last_name}".strip()
        if not full_name:
            full_name = (getattr(user, 'username', None) or getattr(user, 'email', None) or 'Name not set').strip()
        return full_name

    def _resolve_designation(self, user):
        designation = (getattr(user, 'designation', None) or '').strip()
        if designation:
            return designation
        department = (getattr(user, 'department', None) or '').strip()
        return department or None



    def create_signature_template(self, user_detail):
        # Create base image with white background
        img = Image.new('RGBA', (self.template_width, self.template_height), (255, 255, 255, 255))
        
        # Load fonts with compact sizing for 620x150 canvas
        try:
            name_font = ImageFont.truetype("/usr/share/fonts/truetype/dejavu/DejaVuSans-Bold.ttf", 22)
            detail_font = ImageFont.truetype("/usr/share/fonts/truetype/dejavu/DejaVuSans.ttf", 14)
        except:
            name_font = ImageFont.load_default()
            detail_font = ImageFont.load_default()
        
        # Colors
        text_color = (0, 0, 0)  # Black text
        
        # User's full name
        full_name = self._resolve_full_name(user_detail.user, user_detail)
        
        draw = ImageDraw.Draw(img)
        
        # Draw vertical divider line between left and right zones
        divider_color = (217, 217, 217)  # Light gray
        draw.line([(self.divider_x, 12), (self.divider_x, self.template_height - 12)], fill=divider_color, width=1)
        
        # Add company logo in CENTER ZONE (larger watermark)
        _, logo_source, logo_path = self.resolve_company_logo(user_detail.user)
        if logo_path:
            try:
                if os.path.exists(logo_path):
                    logger.info(f"Loading company logo from {logo_path} for user {user_detail.user.id}")
                    logo = Image.open(logo_path)
                    # Resize logo to fit larger watermark area
                    logo.thumbnail((self.logo_max_width, self.logo_max_height), Image.Resampling.LANCZOS)
                    
                    # Create logo with configurable opacity
                    logo_rgba = logo.convert('RGBA')
                    alpha = logo_rgba.split()[-1]
                    alpha = alpha.point(lambda p: int(p * self.logo_opacity))  # Use configurable opacity
                    logo_rgba.putalpha(alpha)
                    
                    # Position centered for better visibility after cropping
                    logo_x = self.center_zone_x - (logo.width // 2)
                    logo_y = (self.template_height - logo.height) // 2
                    
                    # Paste logo in center zone
                    img.paste(logo_rgba, (logo_x, logo_y), logo_rgba)
                    logger.info(f"Company logo pasted successfully at ({logo_x}, {logo_y}) size {logo.width}x{logo.height}")
                else:
                    logger.warning(f"Company logo file does not exist: {logo_path}")
            except Exception as e:
                logger.exception(f"Error loading/pasting company logo for user {user_detail.user.id}: {e}")
        else:
            logger.warning(f"No company logo found for user {user_detail.user.id} (company: {self._get_company_name(user_detail.user)})")
        
        # LEFT ZONE: User name and Employee ID with tighter spacing
        left_y = 20  # Reduced top padding
        
        # Name in LEFT ZONE
        draw.text((self.left_zone_x, left_y), full_name, font=name_font, fill=text_color)
        
        # Employee ID in LEFT ZONE (below name)
        employee_id = None
        try:
            if hasattr(user_detail, 'employee_id') and user_detail.employee_id:
                employee_id = user_detail.employee_id
        except Exception as e:
            logger.exception("Error reading employee_id for user %s: %s", user_detail.user.id, e)
            
        if employee_id:
            left_y += 24  # Tighter spacing
            draw.text((self.left_zone_x, left_y), f"ID: {employee_id}", font=detail_font, fill=(102, 102, 102))
        
        # Designation in LEFT ZONE (below employee ID)
        designation = self._resolve_designation(user_detail.user)
        if designation:
            left_y += 16  # Tighter spacing
            draw.text((self.left_zone_x, left_y), designation, font=detail_font, fill=(102, 102, 102))
        
        # RIGHT ZONE: Digital signature text, department, company with tighter spacing
        right_y = 20  # Reduced top padding
        
        # "Digitally signed by" and name in RIGHT ZONE
        draw.text((self.right_zone_x, right_y), "Digitally signed by", font=detail_font, fill=text_color)
        right_y += 16
        draw.text((self.right_zone_x, right_y), full_name, font=detail_font, fill=text_color)
        right_y += 16  # Tighter spacing
        
        # Department in RIGHT ZONE
        if user_detail.user.department:
            draw.text((self.right_zone_x, right_y), user_detail.user.department, font=detail_font, fill=(102, 102, 102))
            right_y += 16  # Tighter spacing
        
        # Company name in RIGHT ZONE
        company_name = self._get_company_name(user_detail.user)
        if company_name:
            draw.text((self.right_zone_x, right_y), company_name, font=detail_font, fill=(136, 136, 136))
            right_y += 16  # Tighter spacing
        
        # Date placeholder in RIGHT ZONE
        draw.text((self.right_zone_x, right_y), "Date: [SIGNED_DATE]", font=detail_font, fill=(51, 51, 51))
        
        # Convert to RGB
        img = img.convert('RGB')
        
        # Debug log after image creation
        logger.info("Signature template rendered size=%sx%s user=%s", img.width, img.height, user_detail.user.id)
        
        # Save template to memory
        img_io = io.BytesIO()
        img.save(img_io, format='PNG', quality=95)
        img_io.seek(0)
        
        # Create template data with versioned filename
        employee_id = getattr(user_detail, 'employee_id', '') or ''
        template_data = {
            'user_id': user_detail.user.id,
            'full_name': full_name,
            'designation': designation or '',
            'employee_id': employee_id,
            'company_name': self._get_company_name(user_detail.user),
            'template_created_at': datetime.now().isoformat(),
            'template_version': '4.1',  # Updated version with divider
            'logo_source': logo_source,
            'logo_present': bool(logo_source)
        }
        
        # Create Django file with versioned filename
        filename = f"signature_template_v4_{user_detail.user.id}_{datetime.now().strftime('%Y%m%d_%H%M%S')}.png"
        template_file = ContentFile(img_io.getvalue(), name=filename)
        
        return template_file, template_data

    def generate_signed_document_signature(self, user_detail, sign_datetime=None):
        """
        Generate a signature for actual document signing with current date/time
        
        Args:
            user_detail: UserDetail instance
            sign_datetime: datetime object (defaults to now)
            
        Returns:
            ContentFile: Signature image with filled date/time
        """
        if not sign_datetime:
            sign_datetime = datetime.now()
            
        # Load the template
        if not user_detail.signature_template:
            raise ValueError("No signature template found for user")
            
        try:
            template_img = Image.open(user_detail.signature_template.path)
        except:
            raise ValueError("Could not load signature template")
        
        # Create a copy for modification
        signed_img = template_img.copy()
        draw = ImageDraw.Draw(signed_img)
        
        # Load font
        try:
            detail_font = ImageFont.truetype("/usr/share/fonts/truetype/dejavu/DejaVuSans.ttf", 14)
        except:
            detail_font = ImageFont.load_default()
        
        # Format date as "DD MMM YYYY, hh:mm A IST"
        import pytz
        ist = pytz.timezone('Asia/Kolkata')
        local_time = sign_datetime.astimezone(ist)
        date_text = f"Date: {local_time.strftime('%d %b %Y, %I:%M %p IST')}"
        
        # Position in RIGHT ZONE (match template generation spacing)
        right_y = 20
        right_y += 16  # "Digitally signed by"
        right_y += 16  # Name
        if user_detail.user.department:
            right_y += 16
        company_name = self._get_company_name(user_detail.user)
        if company_name:
            right_y += 16
        date_y = right_y
        
        # Clear the placeholder area by drawing white rectangle
        placeholder_bbox = draw.textbbox((self.right_zone_x, date_y), "Date: [SIGNED_DATE]", font=detail_font)
        draw.rectangle(placeholder_bbox, fill=(255, 255, 255))
        
        # Draw the actual date in RIGHT ZONE
        draw.text((self.right_zone_x, date_y), date_text, font=detail_font, fill=(51, 51, 51))
        
        # Save to memory
        img_io = io.BytesIO()
        signed_img.save(img_io, format='PNG', quality=95)
        img_io.seek(0)
        
        # Create filename with timestamp
        filename = f"signature_{user_detail.user.id}_{sign_datetime.strftime('%Y%m%d_%H%M%S')}.png"
        return ContentFile(img_io.getvalue(), name=filename)

# Standard interface functions
def create_signature_template(user_detail):
    """Create signature template for any user type"""
    generator = SignatureTemplateGenerator()
    template_file, template_data = generator.create_signature_template(user_detail)
    
    # Save to user detail
    user_detail.signature_template = template_file
    user_detail.save()
    
    return template_file
