import os, sys
sys.path.insert(0, os.path.dirname(__file__)); import youtube_live as yl
os.makedirs("out", exist_ok=True)
for v in ["yqJBRmpOpnM","xMcOt8M6yxE","zjQ8zjYZZ9s","gRT6_SPdSXA","fPqG3MF7_UQ"]:
    st, d = yl.thumb_status(v, "maxresdefault_live")
    if not d: st, d = yl.thumb_status(v)
    print(v, st, len(d or b""))
    if d: open(f"out/{v}.jpg","wb").write(d)
