extends RefCounted
## Натянутая нитка (design/natyanutaya_nitka.md). Слова Романа 24.11.2026: «Какой смысл ты рисуешь тропу
## если она все равно становится прямой?», «кривой не нужно пускай она выравнивается!»
## Нитка натянута от казармы до пальца, цепляется за печенье с той стороны, где шёл палец. Постройки пока проходимы.

const BARRACKS := Vector2(360, 900 - 140)


func _sim() -> Array:
	var sim := Sim.new()
	sim.gold = [1000, 1000]
	return [sim, sim.build(Sim.PLAYER, "barracks", BARRACKS)]


## Ближе всего нитка подходит к центру круга.
func _closest(route: Array, from: Vector2, c: Vector2) -> float:
	var pts := [from] + route
	var best := INF
	for i in pts.size() - 1:
		best = minf(best, c.distance_to(Geometry2D.get_closest_point_to_segment(c, pts[i], pts[i + 1])))
	return best


func _length(pts: Array) -> float:
	var n := 0.0
	for i in pts.size() - 1:
		n += pts[i].distance_to(pts[i + 1])
	return n


## Палец обходит среднее печенье слева или справа и уходит к дому врага.
func _around(cookie: Vector2, side: float) -> Array:
	var trail := []
	for i in range(1, 41):
		var t := i / 40.0
		var p := BARRACKS.lerp(Vector2(360, 110), t)
		p.x += side * 110.0 * sin(t * PI) * (1.0 if absf(p.y - cookie.y) < 260 else 0.6)
		trail.append(p)
	return trail


## Урок L006: обход печенья слева и справа — нитка с той же стороны, не заходит в круг, длиннее прямой,
## а нитка под пальцем на последнем кадре та же, что легла при отпускании.
func test_L006() -> String:
	for side in [-1.0, 1.0]:
		var made := _sim()
		var sim: Sim = made[0]
		var b: Dictionary = made[1]
		var cookie: Vector2 = sim.deposits[5].pos
		var trail := _around(cookie, side)
		var shown: Array = sim.thread(b, trail).route
		if not sim.set_route(b, trail):
			return "обход %s: тропа не легла" % side
		if b.route != shown:
			return "обход %s: под пальцем %s, а легла %s" % [side, shown, b.route]
		var r: float = sim.cfg.deposit_r + sim.cfg.route.margin
		if _closest(b.route, b.pos, cookie) < r - 1.0:
			return "обход %s: нитка зашла в печенье на %.0f из %.0f" % [side, _closest(b.route, b.pos, cookie), r]
		var mid: Vector2 = b.route.reduce(func(a, p): return p if absf(p.y - cookie.y) < absf(a.y - cookie.y) else a, b.route[0])
		if signf(mid.x - cookie.x) != side:
			return "обход %s: нитка легла с другой стороны печенья (%s)" % [side, mid]
		var straight: float = b.pos.distance_to(b.route[-1])
		var length: float = _length([b.pos] + b.route)
		if length < straight + 4.0 or length > _length([b.pos] + trail) + 1.0:
			return "обход %s: длина нитки %.0f при прямой %.0f и следе %.0f" % [side, length, straight, _length([b.pos] + trail)]
	# Волнистый след размахом 40 в чистом поле — ровно прямая.
	var made := _sim()
	var wave := []
	for i in range(1, 30):
		wave.append(Vector2(470 + 20 * sin(i * 1.3), 740 - i * 9))
	made[0].set_route(made[1], wave)
	return "" if made[1].route.size() == 1 else "в чистом поле нитка не прямая: %s" % [made[1].route]


## След прямо сквозь печенье: нитка внутрь не заходит, и отряд после свистка по ней не входит в круг.
func test_warriors_walk_around_not_through() -> String:
	var made := _sim()
	var sim: Sim = made[0]
	var b: Dictionary = made[1]
	var cookie: Vector2 = sim.deposits[5].pos
	sim.set_route(b, [cookie, Vector2(360, 300)])
	var r: float = sim.cfg.deposit_r
	if _closest(b.route, b.pos, cookie) < r + sim.cfg.route.margin - 1.0:
		return "нитка сквозь печенье: %s" % [b.route]
	var inside := 0
	var went := false
	for i in int(40.0 / 0.05):
		sim.step(0.05)
		for u in sim.units:
			if u.side == Sim.PLAYER and u.kind == "warrior" and u.go:
				went = true
				inside += 1 if u.pos.distance_to(cookie) < r else 0
	if not went:
		return "на свисток никто не вышел"
	if inside > 0:
		return "воины заходили в печенье (%d кадров)" % inside
	return ""


## Первый воин у дома врага: [время, x].
func _arrive(trail: Array) -> Array:
	var made := _sim()
	var sim: Sim = made[0]
	sim.set_route(made[1], trail)
	var home: Vector2 = sim.of_side(Sim.ENEMY, "home")[0].pos
	for i in int(90.0 / 0.05):
		sim.step(0.05)
		for u in sim.units:
			if u.side == Sim.PLAYER and u.pos.distance_to(home) < 100:
				return [sim.time, u.pos.x]
	return [INF, 0.0]


## Зачем игроку: обход печенья меняет, каким боком и когда отряд придёт к цели.
## Обход слева — отряд выходит к дому врага слева, справа — справа; широкий обход по краю стола приходит позже.
func test_detour_changes_side_and_time() -> String:
	var cookie := Vector2(360, 500)
	var left := _arrive(_around(cookie, -1.0))
	var right := _arrive(_around(cookie, 1.0))
	var wide := _arrive([Vector2(60, 700), Vector2(60, 300), Vector2(360, 110)])
	if left[0] == INF or right[0] == INF or wide[0] == INF:
		return "отряд не дошёл: слева %s, справа %s, по краю %s" % [left, right, wide]
	if left[1] >= 360 or right[1] <= 360:
		return "бок не тот: слева пришёл в x=%d, справа в x=%d" % [left[1], right[1]]
	if wide[0] < left[0] + 3.0:
		return "обход по краю пришёл за %.1f с, а ближний слева за %.1f с" % [wide[0], left[0]]
	print("    приход к дому врага: слева %.1f с, справа %.1f с, по краю %.1f с" % [left[0], right[0], wide[0]])
	return ""
