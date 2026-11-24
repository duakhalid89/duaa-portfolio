"""Builds blender/avatar.blend and public/models/avatar.glb from the base character.

Run (no Blender skills needed):
  blender -b --factory-startup --python blender/build_avatar.py -- <base.glb> [render_dir]

Steps: import the rigged base model -> rename and tidy the scene -> tune the fabric materials -> pose the
character in a relaxed standing pose -> key a looping "Idle" animation (breathing, weight shift, head and arm
sway) -> add a camera, three-point lighting and a floor for previews -> save the .blend -> export a GLB with
only the character and the Idle clip for the website.
"""
import math, os, sys
import bpy
from mathutils import Matrix, Vector

args = sys.argv[sys.argv.index('--') + 1:] if '--' in sys.argv else []
BASE = args[0]
RENDERS = args[1] if len(args) > 1 else None
ROOT = os.path.join(os.path.dirname(os.path.abspath(__file__)), '..')
BLEND = os.path.join(ROOT, 'blender', 'avatar.blend')
GLB = os.path.join(ROOT, 'public', 'models', 'avatar.glb')
FPS, LOOP = 30, 120  # 4-second idle loop

# ---- import and tidy --------------------------------------------------------------------------------------------
bpy.ops.wm.read_factory_settings(use_empty=True)
bpy.ops.import_scene.gltf(filepath=BASE)
for o in list(bpy.data.objects):
    if o.type == 'MESH' and o.parent is None:  # stray bone-widget sphere from the source rig
        bpy.data.objects.remove(o)
rig = next(o for o in bpy.data.objects if o.type == 'ARMATURE')
body = next(o for o in bpy.data.objects if o.type == 'MESH')
rig.name, rig.data.name = 'Duaa_Rig', 'Duaa_Rig'
body.name, body.data.name = 'Duaa_Avatar', 'Duaa_Avatar'
for a in list(bpy.data.actions):  # the stock clips are replaced by our own idle
    bpy.data.actions.remove(a)
rig.animation_data_create().action = None

# ---- skin weights: keep the jacket on the body --------------------------------------------------------------------
# The auto-rig weighted the blazer's sides and hem to the arm bones, so raising an arm pulled the jacket out like a
# wing. Arm influence is kept only near the arm (within a sleeve's radius of the arm bones, measured in the rest
# pose); further out it fades over a few centimetres and is handed to the torso bone at that height.
def fix_jacket_weights():
    from mathutils.geometry import intersect_point_line
    bones = rig.data.bones
    groups = {g.name: g for g in body.vertex_groups}
    torso = [(1.30, 'Spine2'), (1.18, 'Spine1'), (1.05, 'Spine'), (-9, 'Hips')]
    moved = 0
    for side, extras in (('Left', ('Bone_019', 'Bone_054', 'Bone_053')), ('Right', ('Bone_014', 'Bone_037', 'Bone_036'))):
        arm, fore, hand = (bones[f'mixamorig:{side}{n}'] for n in ('Arm', 'ForeArm', 'Hand'))
        tip = hand.head_local + (hand.tail_local - hand.head_local).normalized() * 0.13   # fingertips
        # (start, end, keep radius, fade-out radius): the upper sleeve is roomier than the forearm, and the hands rest
        # right beside the jacket front, so the forearm only keeps vertices within a tight sleeve radius.
        segs = [(arm.head_local, arm.tail_local, 0.075, 0.11), (fore.head_local, fore.tail_local, 0.055, 0.08),
                (hand.head_local, tip, 0.055, 0.08)]
        names = {f'mixamorig:{side}{n}' for n in ('Arm', 'ForeArm', 'Hand')} | set(extras) | \
            {g for g in groups if g.startswith(f'mixamorig:{side}Hand')}
        idx = {groups[n].index for n in names if n in groups}
        handish = {groups[n].index for n in names if n in groups and 'Hand' in n or n in extras}
        for v in body.data.vertices:
            if any(g.group in handish and g.weight > 0 for g in v.groups):
                continue  # hands and fingers keep their skinning untouched
            ws = [(g.group, g.weight) for g in v.groups if g.group in idx and g.weight > 0]
            if not ws:
                continue
            k = 0.0
            for a, b, keep, gone in segs:
                p_, t_ = intersect_point_line(v.co, a, b)
                d = (v.co - p_).length if 0 <= t_ <= 1 else min((v.co - a).length, (v.co - b).length)
                k = max(k, 1.0 if d <= keep else 0.0 if d >= gone else 1 - (d - keep) / (gone - keep))
            if k >= 1:
                continue
            spill = 0.0
            for gi, w in ws:
                spill += w * (1 - k)
                body.vertex_groups[gi].add([v.index], w * k, 'REPLACE')
            name = next(n for z, n in torso if v.co.z > z)
            tg = groups[f'mixamorig:{name}']
            cur = next((g.weight for g in v.groups if g.group == tg.index), 0.0)
            tg.add([v.index], cur + spill, 'REPLACE')
            moved += 1
    print('jacket weights fixed on', moved, 'vertices')


fix_jacket_weights()

# ---- materials --------------------------------------------------------------------------------------------------
mat = body.material_slots[0].material
mat.name = 'Duaa_Outfit'
bsdf = mat.node_tree.nodes['Principled BSDF']
# Cloth should read matte and keep its true dark colour: lower the specular highlight, no sheen
# (sheen washes black fabric out to grey under the website's coloured rim lights).
rough = bsdf.inputs['Roughness']
if not rough.is_linked:
    rough.default_value = 0.8
bsdf.inputs['Specular IOR Level'].default_value = 0.3
bsdf.inputs['Sheen Weight'].default_value = 0.0

# ---- pose -------------------------------------------------------------------------------------------------------
P = rig.pose.bones
X, Y, Z = Vector((1, 0, 0)), Vector((0, 1, 0)), Vector((0, 0, 1))  # rig space = world space (character faces -Y)


def reset():
    for pb in P:
        pb.rotation_mode = 'QUATERNION'
        pb.rotation_quaternion = (1, 0, 0, 0)
        pb.location = (0, 0, 0)
        pb.scale = (1, 1, 1)
    bpy.context.view_layer.update()


def rot(name, axis, deg):
    """Rotate a bone about a world axis through its own head (parents first, so children follow)."""
    pb = P[f'mixamorig:{name}']
    piv = pb.head.copy()
    pb.matrix = Matrix.Translation(piv) @ Matrix.Rotation(math.radians(deg), 4, axis) @ Matrix.Translation(-piv) @ pb.matrix
    bpy.context.view_layer.update()


def local(name, axis, deg):
    """Rotate a bone about its own local axis (used for finger curls)."""
    pb = P[f'mixamorig:{name}']
    pb.rotation_quaternion = pb.rotation_quaternion @ Matrix.Rotation(math.radians(deg), 4, axis).to_quaternion()


def base_pose(s=0.0, b=0.0):
    """Relaxed stance. `s` is a -1..1 sway phase, `b` a 0..1 breath phase, layered for the idle keys."""
    reset()
    # weight on her left leg: hips twist and roll a touch, the spine counters so the shoulders stay level
    rot('Hips', Z, 4 + 1.5 * s)
    rot('Hips', Y, 1.5 + 0.8 * s)
    rot('Spine', Y, -1.5 - 0.6 * s)
    rot('Spine', X, 1.5 * b)          # breathing: chest lifts and opens slightly
    rot('Spine1', X, 1.2 * b)
    rot('Spine2', Z, -2.5 - 1.0 * s)
    rot('Spine2', X, 1.0 * b)
    # relaxed right knee (the unweighted leg)
    rot('RightUpLeg', X, -4)
    rot('RightLeg', X, 7)
    rot('RightFoot', X, -3)
    # head level, turned a little toward the viewer, slight friendly tilt
    rot('Neck', X, -2 + 0.6 * b)
    rot('Head', Z, 3 + 1.5 * s)
    rot('Head', Y, -3)
    # arms down by the sides with a soft elbow bend, hands turned in toward the thighs
    for side, sgn in (('Left', 1), ('Right', -1)):
        rot(f'{side}Shoulder', Y, sgn * (1.5 - 0.8 * b))
        rot(f'{side}Arm', Y, sgn * 11)
        rot(f'{side}Arm', X, -4 + (1.2 * s * sgn))
        rot(f'{side}ForeArm', X, -10)
        rot(f'{side}ForeArm', Y, -sgn * 4)
        rot(f'{side}Hand', Z, -sgn * 6)
        for f, curl in (('Index', 14), ('Middle', 18), ('Ring', 22), ('Pinky', 26)):
            for k in (1, 2, 3):
                local(f'{side}Hand{f}{k}', X, curl)
        local(f'{side}HandThumb2', X, 8)
    bpy.context.view_layer.update()


# ---- idle loop --------------------------------------------------------------------------------------------------
act = bpy.data.actions.new('Idle')
rig.animation_data.action = act
if hasattr(rig.animation_data, 'action_slot') and act.slots:
    rig.animation_data.action_slot = act.slots[0]
bones = [pb for pb in P if pb.name.startswith('mixamorig:')]
for i, f in enumerate(range(0, LOOP + 1, 15)):
    t = f / LOOP * 2 * math.pi
    base_pose(s=math.sin(t), b=0.5 - 0.5 * math.cos(2 * t))  # one sway and two breaths per loop
    for pb in bones:
        pb.keyframe_insert('rotation_quaternion', frame=f)
for fc in (act.layers[0].strips[0].channelbag(act.slots[0]).fcurves if hasattr(act, 'layers') and act.layers else act.fcurves):
    for kp in fc.keyframe_points:
        kp.interpolation = 'BEZIER'
    fc.modifiers.new('CYCLES')
act.use_fake_user = True

# ---- gesture clips (played on demand by the website, then blended back into Idle) -----------------------------
HIPS = P['mixamorig:Hips']


def drop_hips(m):
    """Lower the whole body by m metres (the legs bend to keep the feet on the floor)."""
    HIPS.matrix = Matrix.Translation((0, 0, -m)) @ HIPS.matrix
    bpy.context.view_layer.update()


def bend_knees(deg):
    for side in ('Left', 'Right'):
        rot(f'{side}UpLeg', X, -deg)
        rot(f'{side}Leg', X, 2 * deg)
        rot(f'{side}Foot', X, -deg)


def point_finger(side):
    """Straighten the index finger, curl the others into a loose fist."""
    for k in (1, 2, 3):
        local(f'{side}HandIndex{k}', X, -14)
        for f in ('Middle', 'Ring', 'Pinky'):
            local(f'{side}Hand{f}{k}', X, 65)
    local(f'{side}HandThumb2', X, 25)
    local(f'{side}HandThumb3', X, 25)


def ease(x):
    x = max(0.0, min(1.0, x))
    return x * x * (3 - 2 * x)


def env(f, n, a=12):
    """0 -> 1 -> 0 envelope for one-shot clips: ease in over `a` frames, ease out over the last `a`."""
    return ease(f / a) * ease((n - f) / a)


def talk(f, n):
    t = f / n * 2 * math.pi
    base_pose(s=0.3 * math.sin(t), b=0.5)
    rot('Head', X, 3 * math.sin(2 * t))                     # small nods
    rot('Head', Z, 4 * math.sin(t))
    # right hand explains, left hand joins in on the second half
    rot('RightArm', X, -18)
    rot('RightForeArm', X, -48 - 10 * math.sin(2 * t))
    rot('RightHand', Y, 35)
    rot('RightForeArm', Z, 10 * math.sin(t))
    lw = 0.5 + 0.5 * math.sin(t - 1.2)
    rot('LeftArm', X, -10 * lw)
    rot('LeftForeArm', X, -38 * lw)
    rot('LeftHand', Y, -30 * lw)


def point(f, n):
    """'Look over here' gesture: forearm raised in front with the index finger up and slightly to her right, head and
    shoulders turned that way. The elbow stays in: the loose blazer can't follow an arm swung out to the side."""
    w = env(f, n, 14)
    base_pose()
    rot('Spine2', Z, -8 * w)                                # turn toward the side she points at
    rot('Head', Z, -18 * w)
    rot('Head', X, -3 * w)
    rot('RightArm', X, -32 * w)                             # upper arm forward a little
    rot('RightArm', Y, 6 * w)
    rot('RightForeArm', X, -78 * w)                         # forearm up in front of the shoulder
    rot('RightForeArm', Z, -14 * w)                         # tipped toward her right (screen left)
    rot('RightHand', X, -10 * w)
    if w > 0.3:
        point_finger('Right')
    rot('LeftHand', Z, -4 * w)


def fist(side, amt=1.0):
    for f in ('Index', 'Middle', 'Ring', 'Pinky'):
        for k in (1, 2, 3):
            local(f'{side}Hand{f}{k}', X, 60 * amt)
    local(f'{side}HandThumb2', X, 30 * amt)
    local(f'{side}HandThumb3', X, 30 * amt)


def think(f, n):
    """Hand on chin while the chatbot works on an answer: right fist under the chin, left arm across the waist
    supporting the elbow, head tilted and glancing up, index finger tapping."""
    t = f / n * 2 * math.pi
    base_pose(b=0.5 + 0.3 * math.sin(t))
    rot('Head', Y, 7 + 2 * math.sin(t))
    rot('Head', X, -6 + 2 * math.sin(2 * t))
    rot('Head', Z, -6)
    rot('RightArm', X, -30)
    rot('RightArm', Z, 14)
    rot('RightForeArm', X, -124)
    rot('RightForeArm', Y, 34)                              # tilt the raised forearm in toward the chin
    rot('RightHand', X, 25)
    fist('Right', 0.8)
    local('RightHandIndex1', X, -40 + 25 * max(0.0, math.sin(4 * t)))   # tap, tap
    rot('LeftArm', X, -14)
    rot('LeftForeArm', X, -72)
    rot('LeftForeArm', Z, -30)


def shrug(f, n):
    """'Not in my CV!' shrug: shoulders up, forearms out with palms up, head tilted."""
    w = env(f, n, 12)
    hold = 0.5 + 0.5 * math.sin(f / n * math.pi * 3)
    base_pose()
    rot('LeftShoulder', Y, -12 * w)
    rot('RightShoulder', Y, 12 * w)
    rot('Head', Y, -9 * w)
    rot('Head', X, (-3 - 2 * hold) * w)
    for side, sgn in (('Left', 1), ('Right', -1)):
        rot(f'{side}Arm', X, -12 * w)
        rot(f'{side}ForeArm', X, -78 * w)
        rot(f'{side}ForeArm', Z, sgn * 11 * w)               # forearms open a little outward
        rot(f'{side}Hand', Y, sgn * 70 * w)                  # palms turn up
        for fn_ in ('Index', 'Middle', 'Ring', 'Pinky'):
            for k in (1, 2, 3):
                local(f'{side}Hand{fn_}{k}', X, -12 * w)     # open hands


def gamer(f, n):
    """Playing on an imaginary controller: hands together at the waist, thumbs mashing, leaning into the turns."""
    t = f / n * 2 * math.pi
    lean = math.sin(t)
    base_pose()
    rot('Spine', Y, 3 * lean)
    rot('Spine2', Y, 6 * lean)
    rot('Spine2', X, -4)
    rot('Head', X, 9)                                        # eyes on the screen... er, controller
    rot('Head', Y, 4 * lean)
    for side, sgn in (('Left', 1), ('Right', -1)):
        rot(f'{side}Arm', X, -16)
        rot(f'{side}Arm', Y, sgn * 5)
        rot(f'{side}ForeArm', X, -42)
        rot(f'{side}ForeArm', Z, -sgn * 30)                  # hands meet around the controller
        rot(f'{side}Hand', Y, -sgn * 25)
        fist(side, 1.0)
        mash = max(0.0, math.sin(6 * t + (0 if sgn > 0 else 1.7)))
        local(f'{side}HandThumb2', X, -30 + 45 * mash)
        local(f'{side}HandThumb3', X, 35 * mash)


def victory(f, n):
    """Fist pump: right fist up by the shoulder, two pumps with a little knee bounce."""
    w = env(f, n, 10)
    pump = max(0.0, math.sin(f / n * 2 * math.pi * 2)) * w
    base_pose()
    drop_hips(0.02 * pump)
    bend_knees(12 * pump)
    rot('Spine2', X, -3 * w)
    rot('Head', X, -6 * w)
    rot('Head', Z, -8 * w)
    rot('RightArm', X, -34 * w)
    rot('RightArm', Y, 6 * w)
    rot('RightForeArm', X, -100 * w - 22 * pump)
    rot('RightForeArm', Z, 10 * w)
    fist('Right', w)
    rot('LeftForeArm', X, -30 * w)
    fist('Left', 0.6 * w)


GESTURES = (('Talk', 90, talk, True), ('Point', 80, point, False), ('Think', 120, think, True), ('Shrug', 60, shrug, False),
            ('Gamer', 90, gamer, True), ('Victory', 70, victory, False))


def fcurves(a):
    return a.layers[0].strips[0].channelbag(a.slots[0]).fcurves if hasattr(a, 'layers') and a.layers else a.fcurves


for name, n, fn, cyclic in GESTURES:
    a = bpy.data.actions.new(name)
    rig.animation_data.action = a
    step = 3
    for f in list(range(0, n, step)) + [n]:
        fn(f, n)
        for pb in bones:
            pb.keyframe_insert('rotation_quaternion', frame=f)
        HIPS.keyframe_insert('location', frame=f)
    if hasattr(rig.animation_data, 'action_slot') and a.slots:
        rig.animation_data.action_slot = a.slots[0]
    for fc in fcurves(a):
        if cyclic:
            fc.modifiers.new('CYCLES')
    a.use_fake_user = True
    print('gesture', name, n, 'frames')
# Idle has no hip translation key; give it one so blending a gesture back to Idle settles the hips at rest.
rig.animation_data.action = act
base_pose()
HIPS.keyframe_insert('location', frame=0)
HIPS.keyframe_insert('location', frame=LOOP)
if hasattr(rig.animation_data, 'action_slot') and act.slots:
    rig.animation_data.action_slot = act.slots[0]

sc = bpy.context.scene
sc.render.fps = FPS
sc.frame_start, sc.frame_end = 0, LOOP - 1
sc.frame_set(0)

# ---- preview stage (saved in the .blend, not exported) ----------------------------------------------------------
cam = bpy.data.objects.new('Camera', bpy.data.cameras.new('Camera'))
sc.collection.objects.link(cam)
sc.camera = cam
cam.data.lens = 50
cam.location = (0.9, -3.4, 1.05)
cam.rotation_euler = (math.radians(88), 0, math.radians(15))
for name, kind, energy, loc, rotn, color in (
    ('Key', 'AREA', 110, (1.6, -2.0, 2.6), (55, 0, 40), (1.0, 0.95, 0.92)),
    ('Fill', 'AREA', 50, (-2.0, -1.6, 1.6), (70, 0, -50), (0.80, 0.75, 1.0)),
    ('Rim', 'AREA', 200, (0.3, 2.2, 2.4), (-55, 0, 175), (0.93, 0.60, 1.0)),
):
    light = bpy.data.objects.new(name, bpy.data.lights.new(name, kind))
    light.data.energy, light.data.color = energy, color
    if kind == 'AREA':
        light.data.size = 1.5
    light.location, light.rotation_euler = loc, [math.radians(a) for a in rotn]
    sc.collection.objects.link(light)
bpy.ops.mesh.primitive_circle_add(vertices=64, radius=1.1, fill_type='NGON', location=(0, 0, 0))
floor = bpy.context.active_object
floor.name = 'Floor'
fm = bpy.data.materials.new('Floor')
fm.diffuse_color = (0.06, 0.03, 0.12, 1)
fm.use_nodes = True
fm.node_tree.nodes['Principled BSDF'].inputs['Base Color'].default_value = (0.06, 0.03, 0.12, 1)
floor.data.materials.append(fm)
world = bpy.data.worlds.new('World')
sc.world = world
world.color = (0.03, 0.02, 0.06)

bpy.ops.wm.save_as_mainfile(filepath=BLEND)
print('saved', BLEND)

# ---- preview renders --------------------------------------------------------------------------------------------
if RENDERS:
    sc.render.resolution_x, sc.render.resolution_y = 600, 900
    for label, frame, angle in (('front', 0, 0), ('three_quarter', 0, 35), ('side', 0, 90), ('front_mid', 60, 0)):
        sc.frame_set(frame)
        a = math.radians(angle)
        cam.location = (3.3 * math.sin(a), -3.3 * math.cos(a), 0.9)
        cam.rotation_euler = (math.radians(90), 0, a)
        sc.render.filepath = os.path.join(RENDERS, f'{label}.png')
        bpy.ops.render.render(write_still=True)
    sc.frame_set(0)

# ---- export for the web -----------------------------------------------------------------------------------------
if '--export' in sys.argv:
    bpy.ops.object.select_all(action='DESELECT')
    rig.select_set(True)
    body.select_set(True)
    # Web build: 1024px textures and Draco-compressed geometry keep the download small on mobile data.
    # (The .blend saved above keeps the full 2048px textures.)
    for im in bpy.data.images:
        if im.size[0] > 1024:
            im.scale(1024, 1024)
    bpy.ops.export_scene.gltf(filepath=GLB, export_format='GLB', use_selection=True, export_animations=True,
                              export_animation_mode='ACTIONS', export_force_sampling=True, export_frame_range=False,
                              export_image_format='JPEG', export_jpeg_quality=82,
                              export_draco_mesh_compression_enable=True, export_draco_mesh_compression_level=6)
    print('exported', GLB)
