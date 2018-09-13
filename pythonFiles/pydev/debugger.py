import sys
import socket
import traceback
import pg_logger
import json

import util as _util

to_bytes = _util.to_bytes
to_str = _util.to_str
read_bytes = _util.read_bytes
write_bytes = _util.write_bytes
read_int = _util.read_int
write_int = _util.write_int
read_string = _util.read_string
write_string = _util.write_string

try:
    xrange
except:
    xrange = range

LOAD = to_bytes('LOAD')
OUTP = to_bytes('OUTP')
DETC = to_bytes('DETC')

def debug(port_num, debug_id, current_pid):
    attach_process(port_num, debug_id, current_pid)
    
    report_process_loaded()

    DebuggerLoop(conn).loop()
    
def report_process_loaded():
    write_bytes(conn, LOAD)
    write_string(conn, '.'.join(map(str, sys.version_info)))

def attach_process(port_num, debug_id, current_pid):
    global conn
    for i in xrange(50):
        try:
            conn = socket.socket(socket.AF_INET, socket.SOCK_STREAM)
            conn.connect(('127.0.0.1', port_num))
            write_string(conn, debug_id)
            write_int(conn, 0) # success
            write_int(conn, current_pid) # success
            break
        except:
            import time
            time.sleep(50. / 1000)
    else:
        sys.stdout.write('&error&failed to attach')
        sys.stderr.flush()
        raise Exception('failed to attach')
    

class DebuggerExitException(Exception): pass


class DebuggerLoop:
    instacne = None
    
    def __init__(self, conn):
        DebuggerLoop.instacne = self
        self._conn = conn
        self._command_table = {
            to_bytes('outp'): self.command_exec_script,
            to_bytes('detc'): self.command_detach
        }

    def loop(self):
        try:
            while True:
                index = read_bytes(self._conn, 4)
                cmd = self._command_table.get(index)
                if cmd is not None:
                    cmd()
                else:
                    if index:
                        sys.stdout.write('&warn&unknown command: %s' % to_str(index))
                        sys.stdout.flush()
                        print('unknown command', index)
                    break
        except DebuggerExitException:
            pass
        except socket.error:
            pass
        except:
            traceback.print_exc()

    def command_exec_script(self):
        raw_input_lst_json = False
        heap_primitives = False
        cumulative_mode = read_int(self._conn)
        if cumulative_mode == 0:
            cumulative_mode = False
        else:
            cumulative_mode = True
        allow_all_modules = read_int(self._conn)
        if allow_all_modules == 0:
            allow_all_modules = False
        else:
            allow_all_modules = True
        max_executed_lines = read_int(self._conn)
        folder = read_string(self._conn)
        sys.path[0] = folder
        resource = read_string(self._conn)
        script_str = read_string(self._conn)
        trace_str = pg_logger.exec_script_str_local(script_str, raw_input_lst_json, cumulative_mode, heap_primitives, max_executed_lines, json_finalizer, probe_exprs=None, allow_all_modules=allow_all_modules)
        write_bytes(self._conn, OUTP)
        write_string(self._conn, resource)
        write_string(self._conn, trace_str)
    
    def command_detach(self):
        write_bytes(self._conn, DETC)


def json_finalizer(input_code, output_trace):
    ret = dict(code=input_code, trace=output_trace)
    json_output = json.dumps(ret, indent=0)
    return json_output