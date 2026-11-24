extends RefCounted
## Пункт 3: лагерь, тропа добычи, носильщики, залежи кончаются.

const NO_DRIP := {"home_drip": {"gold": 0, "every": 1.5}}


func _camp(sim: Sim) -> Dictionary:
	return sim.build(Sim.PLAYER, "camp", Vector2(250, 830))


func _run(sim: Sim, seconds: float) -> void:
	for i in int(seconds * 60):
		sim.step(1.0 / 60.0)


func test_path_snaps_to_deposit_and_moves() -> String:
	var sim := Sim.new()
	var camp := _camp(sim)
	if not sim.set_path(camp, Vector2(170, 760) + Vector2(60, 40)):
		return "тропа не прилипла к залежи в 72 px от пальца"
	if not sim.set_path(camp, Vector2(360, 520)) or camp.target.pos != Vector2(360, 500):
		return "тропа не переехала к другой залежи"
	if sim.set_path(camp, Vector2(360, 700)):
		return "тропа прилипла, хотя залежей рядом нет"
	return ""


func test_carriers_bring_gold() -> String:
	var sim := Sim.new(NO_DRIP)
	var camp := _camp(sim)
	sim.set_path(camp, Vector2(170, 760))
	var before: int = sim.gold[Sim.PLAYER]
	_run(sim, 20.0)
	var got: float = sim.gold[Sim.PLAYER] - before
	var taken: float = camp.target.max - camp.target.gold
	if sim.units.size() != sim.cfg.camp.carriers:
		return "носильщиков %d, ждали %d" % [sim.units.size(), sim.cfg.camp.carriers]
	if got < 20 or taken < got:
		return "за 20 с принесли %d золота, из залежи взято %d" % [got, taken]
	return ""


func test_deposit_runs_out() -> String:
	var sim := Sim.new(NO_DRIP)
	sim.deposits[0].gold = 12.0
	var camp := _camp(sim)
	sim.set_path(camp, sim.deposits[0].pos)
	var before: int = sim.gold[Sim.PLAYER]
	_run(sim, 40.0)
	if sim.deposits[0].gold != 0 or sim.gold[Sim.PLAYER] - before != 12:
		return "в залежи осталось %d, принесли %d из 12" % [sim.deposits[0].gold, sim.gold[Sim.PLAYER] - before]
	return ""
