#!/usr/bin/env python3
import argparse, json, subprocess, sys, time
REQ = {"jsonrpc":"2.0","id":1,"method":"tool.call","params":{"name":"health_check","arguments":{}}}
def run_node(entry): return subprocess.Popen(["node", entry], stdin=subprocess.PIPE, stdout=subprocess.PIPE, stderr=subprocess.PIPE, text=True)
def run_python(entry): return subprocess.Popen([sys.executable, entry], stdin=subprocess.PIPE, stdout=subprocess.PIPE, stderr=subprocess.PIPE, text=True)
def main():
    ap = argparse.ArgumentParser()
    ap.add_argument("--node", help="Path to built Node server (dist/index.js)")
    ap.add_argument("--python", help="Path to Python server (server/main.py)")
    args = ap.parse_args()
    if not (args.node or args.python): ap.error("Provide --node or --python")
    proc = run_node(args.node) if args.node else run_python(args.python)
    time.sleep(0.2)
    proc.stdin.write(json.dumps(REQ) + "\n"); proc.stdin.flush()
    line = proc.stdout.readline().strip(); print("<<", line); proc.kill()
if __name__ == "__main__": main()
