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


## Зачем игроку: новичку не надо догадываться, что лагерю нужна тропа (слепой игрок на 0.25 ждал 30 с,
## на 0.29 принял подсказку за работу). Лагерь сразу тянет тропу к ближайшему свободному печенью и носит крошки,
## второй лагерь рядом берёт другое печенье, перетягивание меняет цель.
func test_camp_mines_nearest_cookie_by_itself() -> String:
	var sim := Sim.new()
	sim.gold = [1000, 1000]
	var a := sim.build(Sim.PLAYER, "camp", Vector2(250, 830))
	var b := sim.build(Sim.PLAYER, "camp", Vector2(250, 700))
	if a.target.get("pos") != Vector2(170, 760):
		return "лагерь не взял ближайшее печенье сам: %s" % [a.target.get("pos")]
	if b.target.is_empty() or is_same(b.target, a.target):
		return "второй лагерь не взял другое свободное печенье"
	var g: float = sim.gold[Sim.PLAYER]
	for i in int(30 / 0.05):
		sim.step(0.05)
	if sim.gold[Sim.PLAYER] - g <= sim.cfg.home_drip.gold * 30 / sim.cfg.home_drip.every:
		return "лагерь без перетягивания не принёс крошек за 30 с"
	sim.set_path(a, Vector2(360, 500))
	return "" if a.target.get("pos") == Vector2(360, 500) else "перетягивание не сменило печенье"
