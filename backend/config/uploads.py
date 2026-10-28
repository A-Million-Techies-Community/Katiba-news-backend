"""Reject oversized file streams before they consume disk or application memory."""
from django.core.files.uploadhandler import FileUploadHandler, StopUpload


class LimitedUploadHandler(FileUploadHandler):
    def __init__(self, *args, **kwargs):
        super().__init__(*args, **kwargs)
        self.total = 0

    def new_file(self, *args, **kwargs):
        super().new_file(*args, **kwargs)
        self.received = 0

    def receive_data_chunk(self, raw_data, start):
        self.received += len(raw_data)
        self.total += len(raw_data)
        if self.received > 5 * 1024 * 1024 or self.total > 5 * 1024 * 1024:
            raise StopUpload(connection_reset=False)
        return raw_data

    def file_complete(self, file_size):
        return None
