extends RefCounted
## Враг (часть пункта 5): строит, добывает, нападает. Партия доигрывается до победы и до поражения.


const DT := 0.05

## Партия с шагом DT; play(sim) — ход игрока раз в every с, первый после delay. Возвращает время конца
## (минус — победа игрока) или 0.
func _match(play: Callable, limit := 600.0, every := 2.0, delay := 0.0) -> float:
	var sim := Sim.new()
	var enemy := Enemy.new(sim)
	var think := -delay
	for i in int(limit / DT):
		enemy.step(DT)
		sim.step(DT)
		think += DT
		if think >= every:
			think = 0.0
			play.call(sim)
		if sim.winner != -1:
			return sim.time if sim.winner == Sim.ENEMY else -sim.time
	return 0.0


## Простой игрок: два лагеря к ближним залежам, потом к свободным; три казармы на врага.
func _rush(sim: Sim) -> void:
	var camps := sim.of_side(Sim.PLAYER, "camp")
	if camps.size() < 2:
		var at: Vector2 = [Vector2(250, 830), Vector2(470, 830)][camps.size()]
		var c := sim.build(Sim.PLAYER, "camp", at)
		if not c.is_empty():
			sim.set_path(c, [Vector2(170, 760), Vector2(550, 760)][camps.size()])
	elif sim.of_side(Sim.PLAYER, "barracks").size() < 3:
		var n := sim.of_side(Sim.PLAYER, "barracks").size()
		sim.build(Sim.PLAYER, "barracks", [Vector2(300, 750), Vector2(420, 750), Vector2(360, 640)][n])
	var helper := Enemy.new(sim)
	helper.side = Sim.PLAYER
	for c in camps:
		if c.target.get("gold", 0) <= 0 and not helper._free_deposit(c.pos).is_empty():
			sim.set_path(c, helper._free_deposit(c.pos).pos)
	for b in sim.of_side(Sim.PLAYER, "barracks"):
		if sim.time > 40 and (b.target.is_empty() or b.target.hp <= 0) and not sim.of_side(Sim.ENEMY).is_empty():
			sim.set_path(b, sim.of_side(Sim.ENEMY)[-1].pos)


func test_enemy_builds_and_mines() -> String:
	var sim := Sim.new()
	var enemy := Enemy.new(sim)
	for i in int(30 / DT):
		enemy.step(DT)
		sim.step(DT)
	var camps := sim.of_side(Sim.ENEMY, "camp").filter(func(c): return not c.target.is_empty())
	if camps.size() < 2:
		return "за 30 с у врага %d лагерей с тропой, ждали 2" % camps.size()
	return ""


func test_passive_player_loses() -> String:
	var t := _match(func(_s): pass)
	if t <= 0:
		return "игрок без действий не проиграл за 10 минут (итог %.0f)" % t
	print("    поражение бездействием на %d:%02d" % [int(t) / 60, int(t) % 60])
	return ""


## Одной партии бота не верим (партии хаотичны): 12 партий при двух темпах игрока,
## простой игрок выигрывает больше половины, медиана конца — не дольше 10 минут.
func test_simple_player_wins() -> String:
	var ends := []
	for every in [1.0, 2.0]:
		for k in 6:
			ends.append(_match(_rush, 900.0, every, k * 0.3))
	var wins := ends.filter(func(t): return t < 0).size()
	var times := ends.map(func(t): return absf(t) if t != 0.0 else 900.0)
	times.sort()
	var median: float = (times[5] + times[6]) / 2.0
	print("    простой игрок: побед %d из 12, медиана конца %d:%02d" % [wins, int(median) / 60, int(median) % 60])
	if wins <= 6 or median > 600.0:
		return "простой игрок: побед %d из 12, медиана конца %d с (ждали больше 6 и не дольше 600)" % [wins, median]
	return ""


## Зачем игроку (Роман 24.11: «игры одинаковые, бот ведет себя одинаково, не пользуется башнями»): у врага характер.
## Простой игрок против спокойной Тихони (первая партия новичка) живёт хотя бы вдвое дольше, чем против Охотника;
## Тихоня и Ползун ставят башни.
func test_enemy_characters_play_differently() -> String:
	var ends := {}
	var towers := {}
	for who in ["tihonya", "ohotnik", "polzun"]:
		var sim := Sim.new()
		var enemy := Enemy.new(sim, who)
		var think := 0.0
		while sim.winner == -1 and sim.time < 900:
			enemy.step(DT)
			sim.step(DT)
			think += DT
			if think >= 2.0:
				think = 0.0
				_rush(sim)
			towers[who] = maxi(towers.get(who, 0), enemy.towers_built)
		ends[who] = sim.time
	print("    простой игрок: против Тихони %d с, против Охотника %d с; башен у Тихони %d, у Ползуна %d" % [ends.tihonya, ends.ohotnik, towers.tihonya, towers.polzun])
	if ends.tihonya < ends.ohotnik * 2.0:
		return "Тихоня и Охотник играют похоже: партии %d с и %d с" % [ends.tihonya, ends.ohotnik]
	if towers.tihonya == 0 or towers.polzun == 0:
		return "башни не ставит: Тихоня %d, Ползун %d" % [towers.tihonya, towers.polzun]
	if Enemy.new(Sim.new()).who != "zadira" or JSON.parse_string(FileAccess.get_file_as_string(Enemy.CHARS)).order[0] != "tihonya":
		return "первая партия не против Тихони или проверки не против Задиры"
	return ""
