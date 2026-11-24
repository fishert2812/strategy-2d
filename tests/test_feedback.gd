extends RefCounted
## Пункт 6: каждое действие отвечает звуком; разрушение трясёт экран; золото всплывает цифрой.


func test_actions_answer_with_sound_and_shake() -> String:
	var battle: Control = load("res://scenes/battle.tscn").instantiate()
	(Engine.get_main_loop() as SceneTree).root.add_child(battle)
	var sim: Sim = battle.sim
	var fb: Node = battle.get_node("Feedback")
	var camp := sim.build(Sim.PLAYER, "camp", Vector2(250, 830))
	sim.set_path(camp, Vector2(170, 760))
	sim.gold[Sim.ENEMY] = 100
	var theirs := sim.build(Sim.ENEMY, "camp", Vector2(250, 170))
	for i in 200:
		sim.step(1.0 / 60.0)
	var floats: int = battle.world.get_children().filter(func(n): return n is Label).size()
	sim.damage(theirs, theirs.hp)
	var shake: float = battle.shake
	sim.damage(sim.of_side(Sim.ENEMY, "home")[0], 1.0e9)
	var played: Dictionary = fb.played.duplicate()
	battle.free()
	for what in ["built", "path", "gold", "destroyed", "win"]:
		if played.get(what, 0) == 0:
			return "нет звука на «%s» (звучало: %s)" % [what, played]
	if shake <= 0:
		return "разрушение не трясёт экран"
	if floats == 0:
		return "золото не всплыло цифрой"
	return ""


func test_every_sound_file_loads() -> String:
	var fb: Node = load("res://scripts/feedback.gd").new()
	for what in fb.SOUNDS:
		var path := "res://audio/%s.ogg" % fb.FILES.get(what, what)
		if not load(path) is AudioStream:
			fb.free()
			return "не грузится звук %s" % path
	fb.free()
	return ""
