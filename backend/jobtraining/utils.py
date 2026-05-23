import json
from django.core.serializers.json import DjangoJSONEncoder

class BinaryAwareJSONEncoder(DjangoJSONEncoder):
    """
    JSON encoder that can handle binary data by decoding it to latin-1
    """
    def default(self, obj):
        if isinstance(obj, bytes):
            try:
                return obj.decode('utf-8')
            except UnicodeDecodeError:
                return obj.decode('latin-1')
        return super().default(obj)

def safe_json_dumps(data):
    """
    Safely convert data to JSON string, handling binary data
    """
    return json.dumps(data, cls=BinaryAwareJSONEncoder)