"""Measures cold joblib.load time and process memory growth for each model.
Each model is loaded N times in a fresh subprocess so OS caching effects are visible."""
import json, subprocess, sys, time
from pathlib import Path

MODEL_DIR = Path(__file__).resolve().parents[2] / "ml models" / "models"
CHILD = r'''
import ctypes, ctypes.wintypes, json, sys, time, joblib
class PMC(ctypes.Structure):
    _fields_=[("cb",ctypes.wintypes.DWORD),("PageFaultCount",ctypes.wintypes.DWORD)]+[(n,ctypes.c_size_t) for n in
      ("PeakWorkingSetSize","WorkingSetSize","QuotaPeakPagedPoolUsage","QuotaPagedPoolUsage","QuotaPeakNonPagedPoolUsage",
       "QuotaNonPagedPoolUsage","PagefileUsage","PeakPagefileUsage","PrivateUsage")]
k32=ctypes.windll.kernel32; k32.GetCurrentProcess.restype=ctypes.wintypes.HANDLE
psapi=ctypes.windll.psapi; psapi.GetProcessMemoryInfo.argtypes=[ctypes.wintypes.HANDLE,ctypes.c_void_p,ctypes.wintypes.DWORD]
def mem():
    c=PMC(); c.cb=ctypes.sizeof(c)
    if not psapi.GetProcessMemoryInfo(k32.GetCurrentProcess(),ctypes.byref(c),c.cb): raise OSError("GetProcessMemoryInfo failed")
    return c.PrivateUsage, c.PeakWorkingSetSize
t0=time.perf_counter(); import sklearn.ensemble, xgboost; imp=time.perf_counter()-t0  # imports excluded from load_s
before,_=mem(); t=time.perf_counter(); m=joblib.load(sys.argv[1]); dt=time.perf_counter()-t; after,peak=mem()
print(json.dumps({"import_libs_s":imp,"load_s":dt,"private_mb_delta":(after-before)/2**20,"peak_working_set_mb":peak/2**20,"type":type(m).__name__}))
'''
def main(reps=3):
    out = {}
    for name in ["price_predictor_xgb.pkl", "demand_predictor_xgb.pkl"]:
        p = MODEL_DIR / name
        runs = []
        for _ in range(reps):
            r = subprocess.run([sys.executable, "-I", "-W", "ignore", "-c", CHILD, str(p)], capture_output=True, text=True, check=True)
            runs.append(json.loads(r.stdout.strip().splitlines()[-1]))
        loads = sorted(x["load_s"] for x in runs)
        out[name] = {"file_mb": p.stat().st_size / 2**20, "runs": runs, "median_load_s": loads[len(loads)//2]}
    return out

if __name__ == "__main__":
    print(json.dumps(main(int(sys.argv[1]) if len(sys.argv) > 1 else 3), indent=2))
