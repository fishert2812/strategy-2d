extends RefCounted
## Вязаный воин из поз Романа: бежит шагами, колет иголкой в сторону врага, ноги во всех кадрах на одной высоте.

const DT := 0.05


func _battle() -> Control:
	var battle: Control = load("res://scenes/battle.tscn").instantiate()
	(Engine.get_main_loop() as SceneTree).root.add_child(battle)
	return battle


## Игрок видит, что отряд бежит, а не скользит, и кто кого колет: на марше меняются шаги,
## в бою воин разворачивается к врагу, замахивается и колет.
func test_warrior_runs_in_steps_and_stabs_at_enemy() -> String:
	var battle := _battle()
	var sim: Sim = battle.sim
	sim.gold = [200, 200]
	var mine := sim.build(Sim.PLAYER, "barracks", Vector2(260, 780))
	var theirs := sim.build(Sim.ENEMY, "barracks", Vector2(460, 220))
	sim.set_route(mine, [theirs.pos])
	sim.set_route(theirs, [mine.pos])
	var pose: Dictionary = battle.look.warrior.pose
	var pics: Array = battle.look.warrior.frames[Sim.PLAYER].map(battle._tex)
	var steps := {}
	var hits := []
	sim.changed.connect(func(what, data):
		if what == "hit" and battle._units.has(data.by) and battle._units.has(data.get("id", -1)):
			hits.append(data))
	while hits.size() < 3 and sim.time < 60:
		battle._process(DT)
		for u in sim.units:
			if u.kind == "warrior" and u.side == Sim.PLAYER and u.go:
				steps[pics.find(battle.sprite_of(u.id).texture)] = true
	var why := ""
	if hits.size() < 3:
		why = "за минуту отряды не подрались"
	elif steps.size() < 3:
		why = "на марше кадров бега %d, а должно быть 3" % steps.size()
	else:
		var hit: Dictionary = hits[-1]
		var by: Sprite2D = battle._units[hit.by]
		var target: Sprite2D = battle._units[hit.id]
		await (Engine.get_main_loop() as SceneTree).create_timer(0.16).timeout
		battle.motion.walk(by, "warrior", 0.0, 0.0)
		var thrust: Texture2D = by.get_meta("frames")[pose.thrust]
		if by.texture != thrust:
			why = "посреди удара воин не колет: кадр %s" % by.get_meta("frames").find(by.texture)
		elif absf(target.position.x - by.position.x) > 1 and by.flip_h != (target.position.x > by.position.x):
			why = "воин колет спиной к цели"
	battle.free()
	return why


## Ноги во всех кадрах на одной высоте, кадры одного размера: фигурка не прыгает при смене кадра.
func test_warrior_frames_share_ground() -> String:
	var dir := "res://art/table/"
	var size := Vector2i.ZERO
	var ground := -1
	for side in [0, 1]:
		for i in 11:
			var img: Image = load(dir + "nk_warrior_%s_%02d.png" % [["blue", "red"][side], i]).get_image()
			if img.is_compressed():
				img.decompress()
			if size != Vector2i.ZERO and img.get_size() != size:
				return "кадр %d размером %s, а первый %s" % [i, img.get_size(), size]
			size = img.get_size()
			var low := 0
			for y in img.get_height():
				for x in img.get_width():
					if img.get_pixel(x, y).a > 0.8:
						low = y
			if ground >= 0 and absi(low - ground) > 1:
				return "кадр %d: подошва на %d, а у первого на %d" % [i, low, ground]
			ground = low
	return ""


## Побитая кружка трескается: игрок видит, что его дом вот-вот падёт, и видит это на картинке, а не только по полоске.
func test_home_cracks_when_beaten() -> String:
	var battle := _battle()
	var sim: Sim = battle.sim
	var home: Dictionary = sim.of_side(Sim.PLAYER, "home")[0]
	battle._process(DT)
	var whole: Texture2D = battle.sprite_of(home.id).texture
	home.hp = home.max_hp * 0.3
	battle._process(DT)
	var beaten: Texture2D = battle.sprite_of(home.id).texture
	battle.free()
	if whole == beaten:
		return "у побитой кружки та же картинка"
	if not beaten.resource_path.contains("cracked"):
		return "побитая кружка не треснула: %s" % beaten.resource_path
	return ""


## Все кадры воина рисуются один раз при входе в партию, а не впервые посреди боя (рывок кадра в браузере).
func test_warrior_frames_drawn_at_start() -> String:
	var battle := _battle()
	var warm: Node = battle.get_node_or_null("Warm")
	var drawn := [] if warm == null else warm.get_children().map(func(s): return s.texture.resource_path)
	var missing: Array = battle.look.warrior.frames[0] + battle.look.warrior.frames[1]
	missing = missing.filter(func(f): return not drawn.has(battle.look.dir + f + ".png"))
	battle.free()
	if missing.size() > 0:
		return "при входе не нарисованы: %s" % [missing]
	return ""
