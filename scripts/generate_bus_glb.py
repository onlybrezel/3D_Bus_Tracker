#!/usr/bin/env python3
"""Generate the small, dependency-free demo double-decker GLB."""
import json, math, struct
from pathlib import Path

blob = bytearray()
buffer_views=[]
accessors=[]

def align():
    while len(blob)%4: blob.append(0)

def add_data(data, target):
    align(); offset=len(blob); blob.extend(data)
    buffer_views.append({"buffer":0,"byteOffset":offset,"byteLength":len(data),"target":target})
    return len(buffer_views)-1

def add_accessor(view, component, count, kind, mins=None, maxs=None):
    a={"bufferView":view,"componentType":component,"count":count,"type":kind}
    if mins is not None: a["min"]=mins
    if maxs is not None: a["max"]=maxs
    accessors.append(a); return len(accessors)-1

def mesh_accessors(vertices, normals, indices):
    pv=add_data(b''.join(struct.pack('<3f',*v) for v in vertices),34962)
    nv=add_data(b''.join(struct.pack('<3f',*n) for n in normals),34962)
    iv=add_data(b''.join(struct.pack('<H',i) for i in indices),34963)
    xs=[v[0] for v in vertices]; ys=[v[1] for v in vertices]; zs=[v[2] for v in vertices]
    return add_accessor(pv,5126,len(vertices),'VEC3',[min(xs),min(ys),min(zs)],[max(xs),max(ys),max(zs)]), add_accessor(nv,5126,len(normals),'VEC3'), add_accessor(iv,5123,len(indices),'SCALAR',[min(indices)],[max(indices)])

# Unit cube with per-face normals.
verts=[]; norms=[]; inds=[]
faces=[((1,0,0),[(.5,-.5,-.5),(.5,.5,-.5),(.5,.5,.5),(.5,-.5,.5)]),((-1,0,0),[(-.5,.5,-.5),(-.5,-.5,-.5),(-.5,-.5,.5),(-.5,.5,.5)]),((0,1,0),[(-.5,.5,-.5),(.5,.5,-.5),(.5,.5,.5),(-.5,.5,.5)]),((0,-1,0),[(.5,-.5,-.5),(-.5,-.5,-.5),(-.5,-.5,.5),(.5,-.5,.5)]),((0,0,1),[(-.5,-.5,.5),(.5,-.5,.5),(.5,.5,.5),(-.5,.5,.5)]),((0,0,-1),[(-.5,.5,-.5),(.5,.5,-.5),(.5,-.5,-.5),(-.5,-.5,-.5)])]
for normal,face in faces:
    base=len(verts); verts+=face; norms += [normal]*4; inds += [base,base+1,base+2,base,base+2,base+3]
cube=mesh_accessors(verts,norms,inds)

# Low-poly wheel, local axis Z.
segments=16; verts=[]; norms=[]; inds=[]
for i in range(segments):
    angle=2*math.pi*i/segments; x=.5*math.cos(angle); y=.5*math.sin(angle); n=(math.cos(angle),math.sin(angle),0)
    verts += [(x,y,-.5),(x,y,.5)]; norms += [n,n]
for i in range(segments):
    j=(i+1)%segments; inds += [2*i,2*j,2*j+1,2*i,2*j+1,2*i+1]
for z,nz in [(-.5,-1),(.5,1)]:
    center=len(verts); verts.append((0,0,z)); norms.append((0,0,nz))
    ring=[]
    for i in range(segments):
        angle=2*math.pi*i/segments; ring.append(len(verts)); verts.append((.5*math.cos(angle),.5*math.sin(angle),z)); norms.append((0,0,nz))
    for i in range(segments):
        j=(i+1)%segments
        inds += [center,ring[j],ring[i]] if nz<0 else [center,ring[i],ring[j]]
wheel=mesh_accessors(verts,norms,inds)

materials=[]
def mat(name,color,metal=.0,rough=.65):
    materials.append({"name":name,"pbrMetallicRoughness":{"baseColorFactor":color,"metallicFactor":metal,"roughnessFactor":rough}}); return len(materials)-1
lime=mat('Electric lime',[.62,.92,.05,1],.05,.38)
dark=mat('Smoked glass',[.015,.035,.04,1],.25,.2)
black=mat('Tyres',[.012,.014,.013,1],0,.9)
silver=mat('Wheel hubs',[.32,.37,.36,1],.75,.28)
white=mat('Headlights',[1,.95,.68,1],.1,.2)
red=mat('Rear lights',[.8,.015,.01,1],.1,.3)

meshes=[]
def mesh(base,material,name):
    p,n,i=base; meshes.append({"name":name,"primitives":[{"attributes":{"POSITION":p,"NORMAL":n},"indices":i,"material":material}]}); return len(meshes)-1
cube_meshes={m:mesh(cube,m,'panel') for m in [lime,dark,black,silver,white,red]}
wheel_black=mesh(wheel,black,'tyre'); wheel_silver=mesh(wheel,silver,'hub')

nodes=[]
def box(name,pos,scale,material): nodes.append({"name":name,"mesh":cube_meshes[material],"translation":pos,"scale":scale})
def cyl(name,pos,scale,material_mesh): nodes.append({"name":name,"mesh":material_mesh,"translation":pos,"scale":scale,"rotation":[0,math.sin(math.pi/4),0,math.cos(math.pi/4)]})

# Body shell and bumpers.
box('Lower body',[0,0,1.35],[2.5,10.8,1.65],lime)
box('Upper body',[0,-.15,2.95],[2.4,10.1,1.7],lime)
box('Roof',[0,-.15,3.91],[2.45,10.15,.18],lime)
box('Front bumper',[0,5.5,.55],[2.55,.18,.25],dark)
box('Rear bumper',[0,-5.5,.55],[2.55,.18,.25],dark)
# Side windows as distinct panes, leaving visible pillars.
for side in (-1,1):
    for level,z in [('lower',1.65),('upper',3.0)]:
        for i,y in enumerate([-3.75,-2.25,-.75,.75,2.25,3.75]):
            box(f'{level} window {side} {i}',[side*1.225,y,z],[.055,1.24,.78],dark)
    # Entry door on curb side and lime panels on the other.
    if side==1:
        box('Front door glass',[1.235,4.65,1.5],[.06,1.1,1.25],dark)
# Front and rear glazing.
box('Front lower windscreen',[0,5.43,1.72],[2.18,.06,.76],dark)
box('Front upper windscreen',[0,4.94,3.08],[2.15,.06,.76],dark)
box('Destination display',[0,5.47,2.38],[1.55,.07,.38],dark)
box('Rear upper window',[0,-5.23,3.05],[2.1,.06,.72],dark)
box('Rear lower window',[0,-5.43,1.75],[2.05,.06,.7],dark)
# Lights.
for x in (-.82,.82):
    box('Headlight',[x,5.58,.82],[.36,.08,.22],white)
    box('Rear light',[x,-5.59,.9],[.25,.08,.34],red)
# Wheels and hubs on both sides.
for x in (-1.28,1.28):
    for y in (-3.55,3.45):
        cyl('Wheel',[x,y,.58],[1.08,1.08,.32],wheel_black)
        cyl('Hub',[x*1.01,y,.58],[.53,.53,.35],wheel_silver)

scene_nodes=list(range(len(nodes)))
gltf={"asset":{"version":"2.0","generator":"BusScope procedural bus"},"scene":0,"scenes":[{"nodes":scene_nodes}],"nodes":nodes,"meshes":meshes,"materials":materials,"buffers":[{"byteLength":len(blob)}],"bufferViews":buffer_views,"accessors":accessors}
json_bytes=json.dumps(gltf,separators=(',',':')).encode(); json_bytes += b' ' * ((4-len(json_bytes)%4)%4)
align(); bin_bytes=bytes(blob); bin_bytes += b'\0'*((4-len(bin_bytes)%4)%4)
total=12+8+len(json_bytes)+8+len(bin_bytes)
out=struct.pack('<4sII',b'glTF',2,total)+struct.pack('<I4s',len(json_bytes),b'JSON')+json_bytes+struct.pack('<I4s',len(bin_bytes),b'BIN\0')+bin_bytes
path=Path('apps/web/public/models/generic-double-decker.glb'); path.write_bytes(out)
print(f'wrote {path} ({len(out)} bytes, {len(nodes)} nodes)')
