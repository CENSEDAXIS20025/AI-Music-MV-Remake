function f(x,y,z){ const a = x*x + 2.25*y*y + z*z - 1; return a*a*a - x*x*z*z*z - 0.1125*y*y*z*z*z; }
// scan along z on the axis and off-axis
for (const [ux, uy] of [[0,0],[0.5,0],[0.89,0],[0,0.5],[0.5,0.5]]) {
  const asp = 16/9;
  const vx = ux*asp, vy = uy;
  let rx = vx*1.45, ry = vy*1.45, rz = 1.9;
  const l = Math.hypot(rx,ry,rz); rx/=l; ry/=l; rz/=l;
  let t = 0.85, hit = -1;
  for (let i=0;i<300;i++){
    const px = rx*t, py = ry*t, pz = -2.7 + rz*t;
    if (Math.abs(f(px,py,pz)) < 0.0035) { hit = t; break; }
    t += 0.0075;
  }
  console.log(`uv(${ux},${uy}) -> hit t=${hit<0?'none':hit.toFixed(3)}  point z=${(-2.7+rz*t).toFixed(3)}`);
}
console.log("surface extent scan:");
for (const z of [-1.6,-1.4,-1.2,-1.0,-0.5,0,0.5,1.0,1.2]) {
  let maxr = 0;
  for (let a=0;a<360;a+=5){ const th=a*Math.PI/180;
    for (let r=0.05;r<2.5;r+=0.01){ if (Math.abs(f(Math.cos(th)*r, Math.sin(th)*r, z)) < 0.02) { maxr = Math.max(maxr, r); } } }
  console.log(`  z=${z.toFixed(2)}  max radius in xy = ${maxr.toFixed(2)}`);
}
