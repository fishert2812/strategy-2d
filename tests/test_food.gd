extends RefCounted
## Войско ест крошки (issue #28): воин стоит крошек, при нехватке отряд меньше и коробок голодный, трофей.


func _run(sim: Sim, seconds: float) -> void:
	for i in int(seconds / 0.05):
		sim.step(0.05)


func _warriors(sim: Sim, side: int) -> int:
	return sim.units.filter(func(u): return u.side == side and u.kind == "warrior").size()


## Каждый воин списывает warrior.cost крошек.
func test_each_warrior_costs_crumbs() -> String:
	var sim := Sim.new({"home_drip": {"gold": 0, "every": 1.0}})
	sim.gold[Sim.PLAYER] = 200
	sim.build(Sim.PLAYER, "barracks", Vector2(360, 760))
	var before: float = sim.gold[Sim.PLAYER]
	_run(sim, 21.0)
	var n := _warriors(sim, Sim.PLAYER)
	var spent: float = before - sim.gold[Sim.PLAYER]
	if n == 0 or spent != n * sim.cfg.warrior.cost:
		return "воинов %d, списано %d крошек, ждали %d" % [n, spent, n * sim.cfg.warrior.cost]
	return ""


## Крошек на двоих — отряд из двух, коробок голодный.
func test_short_of_crumbs_squad_is_smaller() -> String:
	var sim := Sim.new({"home_drip": {"gold": 0, "every": 1.0}})
	sim.gold[Sim.PLAYER] = 60
	var b := sim.build(Sim.PLAYER, "barracks", Vector2(360, 760))
	sim.gold[Sim.PLAYER] = 2 * sim.cfg.warrior.cost
	_run(sim, 21.0)
	var n := _warriors(sim, Sim.PLAYER)
	if n != 2:
		return "на крошки для двоих вышло воинов %d" % n
	if not b.hungry:
		return "коробок без крошек не голодный"
	return ""


## Разрушил постройку врага — получил трофей: долю её цены.
func test_trophy_for_destroyed_building() -> String:
	var sim := Sim.new()
	sim.gold[Sim.ENEMY] = 100
	var camp := sim.build(Sim.ENEMY, "camp", Vector2(250, 170))
	var before: float = sim.gold[Sim.PLAYER]
	sim.damage(camp, camp.hp)
	var got: float = sim.gold[Sim.PLAYER] - before
	var want: float = floor(sim.cfg.buildings.camp.cost * sim.cfg.trophy)
	if got != want or want <= 0:
		return "трофей за лагерь %d, ждали %d" % [got, want]
	return ""
