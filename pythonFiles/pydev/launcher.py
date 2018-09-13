import os
import os.path
import sys
import traceback
sys.stdout.write('&info&succeeded to launch script')
sys.stdout.flush()
try:
    import debugger
except:
    traceback.print_exc()
    print('Press Enter to close...')
    try:
        raw_input()
    except NameError:
        input()
    sys.exit(1)


#=======================================================================================================================
# 1. Debugger port to connect to.
# 2. GUID for the debug session.
# 3. Startup script name.
#=======================================================================================================================
port_num = int(sys.argv[1])
debug_id = sys.argv[2]
del sys.argv[1:3]

# filename = sys.argv[0]

sys.path[0] = ''

current_pid = os.getpid()

del sys, os

print(current_pid)

debugger.debug(port_num, debug_id, current_pid)