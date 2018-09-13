import sys
import struct
from encodings import utf_8, ascii

try:
    unicode
except:
    unicode = str

try:
    xrange
except:
    xrange = range

if sys.version_info[0] >= 3:
    def to_bytes(cmd_str):
        return ascii.Codec.encode(cmd_str)[0]
else:
    def to_bytes(cmd_str):
        return cmd_str

if sys.version_info[0] >= 3:
    def to_str(cmd_bytes):
        return ascii.Codec.decode(cmd_bytes)[0]
else:
    def to_str(cmd_bytes):
        return cmd_bytes


UNICODE_PREFIX = to_bytes('U')
ASCII_PREFIX = to_bytes('A')
NONE_PREFIX = to_bytes('N')


def read_bytes(conn, count):
    b = to_bytes('')
    while len(b) < count:
        received_data = conn.recv(count - len(b))
        if received_data is None:
            break
        b += received_data
    return b


def write_bytes(conn, b):
    conn.sendall(b)


def read_int(conn):
    # '!' represents network(=big-endian) byte order
    # 'q' represent long long in c type, integer in python type, 8 standard size
    return struct.unpack('!q', read_bytes(conn, 8))[0]


def write_int(conn, i):
    write_bytes(conn, struct.pack('!q', i))


def read_string(conn):
    str_len = read_int(conn)
    if not str_len:
        return ''
    res = to_bytes('')
    while len(res) < str_len:
        res = res + conn.recv(str_len - len(res))
    res = utf_8.decode(res)[0]
    if sys.version_info[0] == 2:
        try:
            res = ascii.Codec.encode(res)[0]
        except UnicodeEncodeError:
            pass
    return res


def write_string(conn, s):
    if s is None:
        write_bytes(conn, NONE_PREFIX)
    elif isinstance(s, unicode):
        b = utf_8.encode(s)[0]
        b_len = len(b)
        write_bytes(conn, UNICODE_PREFIX)
        write_int(conn, b_len)
        if b_len > 0:
            write_bytes(conn, b)
    else:
        s_len = len(s)
        write_bytes(conn, ASCII_PREFIX)
        write_int(conn, s_len)
        if s_len > 0:
            write_bytes(conn, s)