export async function readMacProcesses() {
  const child = Bun.spawn(['ps', '-eo', 'pid=,comm=,args='], { stdout: 'pipe', stderr: 'ignore' });
  const [output, code] = await Promise.all([new Response(child.stdout).text(), child.exited]);
  if (code) throw new Error('ps exited with code ' + code);
  return output;
}
