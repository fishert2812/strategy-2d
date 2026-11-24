extends Node2D
## Проба стиля «бумага под лампой»: всё рисуется кодом, ни одной картинки.
## Простые формы из цветной бумаги, у каждой толщина и мягкая тень от лампы; всё дышит и отзывается.

const W := 720.0
const H := 1280.0
const LAMP := Vector2(170, 90)
## Человечки крупнее построек в пробе нарочно: на телефоне главное — люди.
const MAN := 1.7
const HOUSE := 1.3
const C := {
	"table": Color("#3a2416"), "plank": Color("#4a2f1c"), "grain": Color("#2c1a0f"), "light": Color("#ffd89a"),
	"blue": Color("#3f7ae0"), "blue_d": Color("#244c9e"), "red": Color("#ef4b3c"), "red_d": Color("#9e2a20"),
	"cream": Color("#f6e7c6"), "cream_d": Color("#cdb68c"), "cookie": Color("#e8a94e"), "cookie_d": Color("#a8692a"),
	"choco": Color("#5a3218"), "skin": Color("#f2c28e"), "steel": Color("#e3e8ee"), "wick": Color("#c98d4a"),
	"wick_d": Color("#8c5a2c"), "ink": Color("#1b100a"),
}

var t := 0.0
var things := []  # постройки и печенье: {kind, side, pos, born, hp, shake}
var units := []  # человечки: {kind, side, pos, path, hp, phase, blow, cd, load, dead}
var bits := []  # крошки и пыль: {pos, vel, life, max, size, color}
var rings := []  # волны света и вспышки: {pos, born, life, r, color, width}
var notes := []  # всплывающие «+1»
var arrows := []  # стрелы башни: {from, to, born}
var events := []  # сценарий: [время, вызов]


func _ready() -> void:
	_add("home", 0, Vector2(360, 1090), -10)
	_add("home", 1, Vector2(360, 190), -10)
	for p in [[Vector2(150, 820), 1.0], [Vector2(560, 640), 0.55], [Vector2(170, 470), 0.25], [Vector2(560, 360), 1.0]]:
		var c := _add("cookie", -1, p[0], -10)
		c.hp = p[1]
	_add("camp", 1, Vector2(470, 300), -10)
	_add("barracks", 1, Vector2(250, 290), -10)
	events = [
		[0.4, func(): _add("camp", 0, Vector2(250, 950), t)],
		[1.0, func(): _carrier(0, Vector2(250, 950), Vector2(150, 820))],
		[1.6, func(): _carrier(0, Vector2(250, 950), Vector2(150, 820))],
		[0.8, func(): _carrier(1, Vector2(470, 300), Vector2(560, 360))],
		[2.0, func(): _add("barracks", 0, Vector2(470, 960), t)],
		[3.4, func(): _add("tower", 0, Vector2(200, 660), t)],
		[2.6, func(): _squad(0, Vector2(470, 960), 3)],
		[3.0, func(): _squad(1, Vector2(250, 290), 3)],
		[5.0, _whistle],
		[13.0, _whistle],
	]


func _add(kind: String, side: int, pos: Vector2, born: float) -> Dictionary:
	var d := {"kind": kind, "side": side, "pos": pos, "born": born, "hp": 1.0, "shake": 0.0}
	things.append(d)
	if born > 0:
		_puff(pos, 16, C.cream)
	return d


func _carrier(side: int, home: Vector2, cookie: Vector2) -> void:
	units.append({"kind": "carrier", "side": side, "pos": home, "path": [cookie, home], "loop": true, "hp": 1.0, "phase": randf(), "blow": -1.0, "cd": 0.0, "load": false, "dead": -1.0, "born": t, "go": true})


func _squad(side: int, at: Vector2, n: int) -> void:
	for i in n:
		var post := at + Vector2((i - 1) * 30, -50 if side == 0 else 50)
		units.append({"kind": "warrior", "side": side, "pos": post, "path": [], "loop": false, "hp": 3.0, "phase": randf(), "blow": -1.0, "cd": randf() * 0.5, "load": false, "dead": -1.0, "born": t + i * 0.15, "go": false, "home": at})


## Свисток: по столу от лампы бежит волна тёплого света, все подпрыгивают, отряды выходят.
func _whistle() -> void:
	rings.append({"pos": LAMP, "born": t, "life": 1.6, "r": 1500.0, "color": C.light, "width": 60.0})
	for u in units:
		u.hop = t
		if u.kind == "warrior" and not u.go:
			u.go = true
			var enemy_home: Vector2 = Vector2(360, 190) if u.side == 0 else Vector2(360, 1090)
			var mid := Vector2(360 + (u.pos.x - u.home.x), 640)
			u.path = [mid, enemy_home + Vector2(u.pos.x - u.home.x, 60 if u.side == 0 else -60)]


func _process(dt: float) -> void:
	t += dt
	for e in events.duplicate():
		if t >= e[0]:
			e[1].call()
			events.erase(e)
	for u in units:
		_step(u, dt)
	units = units.filter(func(u): return u.dead < 0 or t - u.dead < 1.2)
	for b in bits:
		b.pos += b.vel * dt
		b.vel *= pow(0.04, dt)
		b.life -= dt
	bits = bits.filter(func(b): return b.life > 0)
	rings = rings.filter(func(r): return t - r.born < r.life)
	notes = notes.filter(func(n): return t - n.born < 1.0)
	arrows = arrows.filter(func(a): return t - a.born < 0.25)
	for th in things:
		th.shake = move_toward(th.shake, 0.0, dt * 3.0)
	_tower_fire()
	queue_redraw()


func _step(u: Dictionary, dt: float) -> void:
	if u.dead >= 0 or t < u.born:
		return
	u.cd = maxf(0.0, u.cd - dt)
	if u.blow >= 0:
		u.blow += dt / 0.35
		if u.blow >= 1.0:
			u.blow = -1.0
	var foe := _foe(u)
	if u.kind == "warrior" and not foe.is_empty():
		u.face = signf(foe.pos.x - u.pos.x) if absf(foe.pos.x - u.pos.x) > 2 else u.get("face", 1.0)
		if u.cd <= 0:
			_strike(u, foe)
		return
	if u.path.is_empty():
		return
	var to: Vector2 = u.path[0]
	var speed := 70.0 if u.kind == "warrior" else (55.0 if u.load else 95.0)
	var step: Vector2 = (to - u.pos).limit_length(speed * dt)
	if step.length() > 0.01:
		u.face = signf(step.x) if absf(step.x) > 0.05 else u.get("face", 1.0)
		u.phase += step.length() / 36.0
		if fmod(u.phase, 0.5) < step.length() / 36.0:
			_puff(u.pos + Vector2(0, 2), 2, C.cream_d, 0.5)
	u.pos += step
	if u.pos.distance_to(to) < 1.0:
		if u.kind == "carrier":
			u.load = not u.load
			if not u.load:
				notes.append({"pos": u.pos + Vector2(0, -50), "born": t, "text": "+1"})
				_crumbs(u.pos, 5)
			else:
				_crumbs(to, 3)
			u.path = [u.path[1], u.path[0]]
		else:
			u.path.pop_front()
			if u.path.is_empty():
				u.siege = true


func _foe(u: Dictionary) -> Dictionary:
	if u.kind != "warrior" or not u.go:
		return {}
	for o in units:
		if o.side != u.side and o.dead < 0 and o.kind == "warrior" and o.pos.distance_to(u.pos) < 34 and t >= o.born:
			return o
	if u.get("siege", false):
		for th in things:
			if th.kind == "home" and th.side != u.side and th.pos.distance_to(u.pos) < 110:
				return th
	return {}


func _strike(u: Dictionary, foe: Dictionary) -> void:
	u.blow = 0.0
	u.cd = 0.7 + randf() * 0.2
	var at: Vector2 = foe.pos + (u.pos - foe.pos).normalized() * (14.0 if foe.has("kind") and foe.kind != "home" else 50.0)
	rings.append({"pos": at + Vector2(0, -22), "born": t + 0.12, "life": 0.22, "r": 26.0, "color": Color.WHITE, "width": 6.0})
	_crumbs(at, 4 if foe.kind == "home" else 2)
	if foe.kind == "home":
		foe.hp = maxf(0.2, foe.hp - 0.03)
		foe.shake = 1.0
	else:
		foe.hp -= 1.0
		foe.knock = t
		if foe.hp <= 0:
			foe.dead = t
			_crumbs(foe.pos, 8)


func _tower_fire() -> void:
	for th in things:
		if th.kind != "tower" or t - th.born < 1.0:
			continue
		if t - th.get("shot", 0.0) < 1.1:
			continue
		for u in units:
			if u.side != th.side and u.dead < 0 and u.go and u.pos.distance_to(th.pos) < 190:
				th.shot = t
				th.shake = 0.6
				arrows.append({"from": th.pos + Vector2(0, -70), "to": u.pos + Vector2(0, -20), "born": t})
				u.hp -= 0.5
				u.knock = t + 0.2
				if u.hp <= 0:
					u.dead = t + 0.2
				break


func _puff(pos: Vector2, n: int, color: Color, size := 1.0) -> void:
	for i in n:
		var v := Vector2.from_angle(randf() * TAU) * randf_range(20, 90) * size
		bits.append({"pos": pos, "vel": v, "life": 0.6, "max": 0.6, "size": randf_range(3, 7) * size, "color": color})


func _crumbs(pos: Vector2, n: int) -> void:
	for i in n:
		var v := Vector2.from_angle(randf() * TAU) * randf_range(60, 160)
		bits.append({"pos": pos, "vel": v, "life": 0.9, "max": 0.9, "size": randf_range(2.5, 5), "color": C.cookie if randf() < 0.7 else C.cookie_d})


# ---------- рисование ----------

func _draw() -> void:
	_table()
	for r in rings:
		if r.color == C.light:
			_wave(r)
	var all: Array = things.duplicate() + units.filter(func(u): return t >= u.born)
	all.sort_custom(func(a, b): return a.pos.y < b.pos.y)
	for d in all:
		if d.has("path"):
			_unit(d)
		else:
			call("_" + d.kind, d)
	for b in bits:
		var a: float = b.life / b.max
		draw_circle(b.pos, b.size * (0.6 + 0.4 * a), Color(b.color, a))
	for r in rings:
		if r.color != C.light and t >= r.born:
			var k: float = (t - r.born) / r.life
			draw_arc(r.pos, r.r * (0.4 + k), 0, TAU, 24, Color(r.color, 1.0 - k), r.width * (1.0 - k), true)
	for a in arrows:
		var k: float = clampf((t - a.born) / 0.2, 0, 1)
		var p: Vector2 = (a.from as Vector2).lerp(a.to, k) + Vector2(0, -40 * sin(k * PI))
		var dir: Vector2 = (a.to - a.from).normalized()
		draw_line(p - dir * 18, p, C.cream, 3, true)
		draw_line(p - dir * 4, p, C.steel, 4, true)
	for n in notes:
		var k: float = t - n.born
		draw_string(ThemeDB.fallback_font, n.pos + Vector2(-14, -30 * k), n.text, HORIZONTAL_ALIGNMENT_LEFT, -1, 28, Color(C.light, 1.0 - k))


## Стол ночью: тёмные доски, тёплое пятно лампы сверху слева, темнота к краям.
func _table() -> void:
	draw_rect(Rect2(-200, -400, W + 400, H + 800), C.table)
	for i in 14:
		var y := -400 + i * 150.0
		draw_rect(Rect2(-200, y, W + 400, 146), C.plank.lerp(C.table, 0.35 * (i % 3) / 2.0))
		for g in 3:
			var pts := PackedVector2Array()
			for x in range(-200, int(W) + 220, 40):
				pts.append(Vector2(x, y + 30 + g * 40 + sin(x * 0.013 + i * 1.7 + g) * 6))
			draw_polyline(pts, Color(C.grain, 0.35), 2, true)
	for i in range(36, 0, -1):
		var r := 30.0 * i
		draw_circle(LAMP, r, Color(C.light, 0.03 * (1.0 - i / 40.0) + 0.002))
	for i in 24:
		draw_arc(Vector2(W / 2, H / 2), 700.0 + i * 40, 0, TAU, 64, Color(0, 0, 0, 0.035 * i), 42)


func _wave(r: Dictionary) -> void:
	var k: float = (t - r.born) / r.life
	draw_arc(r.pos, r.r * k, 0, TAU, 96, Color(r.color, 0.22 * (1.0 - k)), r.width, true)


## Вырезанная из бумаги форма: тень от лампы, толщина листа, лицо.
func _paper(pts: PackedVector2Array, color: Color, lift: float, at: Vector2) -> void:
	var away := (at - LAMP).normalized()
	for s in [[lift * 1.0, 0.16], [lift * 0.55, 0.22]]:
		draw_colored_polygon(_moved(pts, away * s[0]), Color(0, 0, 0, s[1]))
	draw_colored_polygon(_moved(pts, Vector2(0, 3)), color.darkened(0.35))
	draw_colored_polygon(pts, color)
	draw_polyline(_closed(pts), Color(1, 1, 1, 0.18), 1.5, true)


func _moved(pts: PackedVector2Array, by: Vector2) -> PackedVector2Array:
	var out := PackedVector2Array()
	for p in pts:
		out.append(p + by)
	return out


func _closed(pts: PackedVector2Array) -> PackedVector2Array:
	var out := pts.duplicate()
	out.append(pts[0])
	return out


func _oval(c: Vector2, r: Vector2, n := 28, from := 0.0, to := TAU) -> PackedVector2Array:
	var out := PackedVector2Array()
	var full := is_equal_approx(to - from, TAU)
	for i in (n if full else n + 1):
		out.append(c + Vector2.from_angle(lerpf(from, to, float(i) / n)) * r)
	return out


func _box(c: Vector2, size: Vector2, round := 10.0) -> PackedVector2Array:
	var out := PackedVector2Array()
	var h := size / 2 - Vector2(round, round)
	for q in 4:
		var corner := c + Vector2(h.x * (1 if q in [0, 3] else -1), h.y * (1 if q < 2 else -1))
		for i in 7:
			out.append(corner + Vector2.from_angle(q * PI / 2 + i * PI / 12) * round)
	return out


## Пружина появления: из ничего с перехлёстом, затухает за полсекунды.
func _spring(d: Dictionary) -> Vector2:
	var k: float = t - d.born
	if k < 0:
		return Vector2.ZERO
	var s := 1.0 - exp(-7.0 * k) * cos(14.0 * k)
	var breathe := 1.0 + 0.015 * sin(t * 2.0 + d.pos.x)
	var sh: float = d.shake
	return Vector2(s * breathe * (1.0 + 0.08 * sh * sin(t * 40)), s / breathe * (1.0 - 0.08 * sh * sin(t * 40)))


func _team(side: int, dark := false) -> Color:
	return [C.blue_d, C.red_d][side] if dark else [C.blue, C.red][side]


func _xf(d: Dictionary) -> void:
	var s := _spring(d)
	draw_set_transform(d.pos, 0.0, s * HOUSE)


## Кружка-дом: бумажная кружка цвета команды, ручка, светлый край, дверца; побитая — трещины.
func _home(d: Dictionary) -> void:
	_xf(d)
	var c := _team(d.side)
	draw_arc(Vector2(52, -40), 24, -PI / 2, PI / 2, 16, c.darkened(0.2), 12, true)
	_paper(_box(Vector2(0, -40), Vector2(110, 96), 14), c, 10, d.pos)
	draw_colored_polygon(_oval(Vector2(0, -88), Vector2(55, 14)), C.cream)
	draw_colored_polygon(_oval(Vector2(0, -86), Vector2(44, 9)), C.choco)
	draw_colored_polygon(_box(Vector2(0, -18), Vector2(30, 40), 14), C.ink)
	draw_circle(Vector2(0, -26), 6, Color(C.light, 0.7 + 0.2 * sin(t * 3)))
	for i in 3:
		draw_line(Vector2(-40 + i * 12, -60 + i * 3), Vector2(-40 + i * 12, -50 + i * 3), C.cream, 2)
	if d.hp < 0.95:
		var n := int((1.0 - d.hp) * 6)
		for i in n:
			var a := Vector2(-30 + i * 14, -80)
			draw_polyline(PackedVector2Array([a, a + Vector2(6, 14), a + Vector2(-2, 26), a + Vector2(5, 38)]), C.ink, 2, true)
	draw_set_transform(Vector2.ZERO)


## Казарма-крышка: зубчатая крышка от бутылки, флажок на спичке.
func _barracks(d: Dictionary) -> void:
	_xf(d)
	var c := _team(d.side)
	var pts := PackedVector2Array()
	for i in 48:
		pts.append(Vector2.from_angle(i * TAU / 48) * Vector2(1, 0.62) * (50.0 if i % 2 == 0 else 45.0) + Vector2(0, -18))
	_paper(pts, c, 8, d.pos)
	draw_colored_polygon(_oval(Vector2(0, -20), Vector2(34, 20)), c.darkened(0.25))
	draw_line(Vector2(18, -22), Vector2(18, -78), C.cream_d, 3)
	var wave := sin(t * 5 + d.pos.x) * 4
	draw_colored_polygon(PackedVector2Array([Vector2(18, -78), Vector2(46, -70 + wave), Vector2(18, -60)]), C.cream)
	draw_set_transform(Vector2.ZERO)


## Лагерь-корзинка: плетёная корзина, ткань цвета команды на ручке.
func _camp(d: Dictionary) -> void:
	_xf(d)
	var c := _team(d.side)
	draw_arc(Vector2(0, -48), 40, PI, TAU, 20, C.wick_d, 7, true)
	_paper(PackedVector2Array([Vector2(-48, -50), Vector2(48, -50), Vector2(36, 0), Vector2(-36, 0)]), C.wick, 8, d.pos)
	for i in 4:
		draw_line(Vector2(-46 + i * 2, -40 + i * 11), Vector2(46 - i * 2, -40 + i * 11), C.wick_d, 2)
	for i in 7:
		draw_line(Vector2(-36 + i * 12, -50), Vector2(-30 + i * 10, 0), Color(C.wick_d, 0.6), 2)
	draw_colored_polygon(PackedVector2Array([Vector2(-50, -52), Vector2(50, -52), Vector2(30, -38), Vector2(-30, -38)]), c)
	draw_set_transform(Vector2.ZERO)


## Башня: катушка ниток цвета команды, на ней лук.
func _tower(d: Dictionary) -> void:
	_xf(d)
	var c := _team(d.side)
	_paper(_box(Vector2(0, -42), Vector2(56, 84), 6), c, 12, d.pos)
	for i in 6:
		draw_line(Vector2(-26, -76 + i * 12), Vector2(26, -72 + i * 12), c.darkened(0.25), 2)
	draw_colored_polygon(_box(Vector2(0, -86), Vector2(78, 14), 6), C.wick)
	draw_colored_polygon(_box(Vector2(0, 2), Vector2(78, 14), 6), C.wick)
	var pull: float = clampf(1.0 - (t - d.get("shot", -9.0)) / 0.3, 0, 1)
	draw_arc(Vector2(0, -104), 22, PI * 0.15, PI * 0.85, 12, C.wick_d, 4, true)
	draw_line(Vector2(-19, -93), Vector2(0, -90 + 10 * (1 - pull)), C.cream, 1.5)
	draw_line(Vector2(19, -93), Vector2(0, -90 + 10 * (1 - pull)), C.cream, 1.5)
	draw_set_transform(Vector2.ZERO)


## Печенье: круглое с шоколадными каплями; съеденное — с укусами по краю.
func _cookie(d: Dictionary) -> void:
	_xf(d)
	var pts := PackedVector2Array()
	var bites := int((1.0 - d.hp) * 5)
	for i in 40:
		var a := i * TAU / 40
		var r := 52.0 * (1.0 + 0.04 * sin(a * 9))
		for b in bites:
			var ba := b * 2.1 + 0.6
			r -= 18.0 * maxf(0.0, cos(a - ba)) ** 24
		pts.append(Vector2.from_angle(a) * Vector2(1, 0.75) * r * (0.55 + 0.45 * d.hp) + Vector2(0, -10))
	_paper(pts, C.cookie, 6, d.pos)
	for i in int(3 + 4 * d.hp):
		var p: Vector2 = Vector2.from_angle(i * 2.4) * Vector2(1, 0.75) * (10.0 + (i * 7) % 22) * (0.55 + 0.45 * d.hp) + Vector2(0, -10)
		draw_circle(p, 4, C.choco)
	draw_set_transform(Vector2.ZERO)


## Человечек из четырёх форм: шапка-колпак, голова, туловище цвета команды, две ноги.
## Шаг — ноги ходят по пройденному пути, удар — рука с иголкой колет вперёд.
func _unit(u: Dictionary) -> void:
	var fade := 1.0 if u.dead < 0 else clampf(1.0 - (t - u.dead) / 1.2, 0, 1)
	var appear := clampf((t - u.born) / 0.25, 0, 1)
	var hop := maxf(0.0, sin(clampf((t - u.get("hop", -9.0)) / 0.3, 0, 1) * PI)) * 12
	var knock := clampf(1.0 - (t - u.get("knock", -9.0)) / 0.25, 0, 1)
	var face: float = u.get("face", 1.0)
	var swing := sin(u.phase * TAU) * 0.6
	var bob := absf(sin(u.phase * TAU)) * 3
	var lie := 0.0 if u.dead < 0 else minf(1.0, (t - u.dead) / 0.2) * PI / 2 * face
	var c := _team(u.side)
	draw_set_transform(u.pos, 0.0, Vector2(face, 1) * appear * MAN)
	draw_colored_polygon(_oval(Vector2(-10, 2), Vector2(14, 5)), Color(0, 0, 0, 0.25 * fade))
	var m := Color(1, 1, 1, fade)
	for leg in [-1, 1]:
		draw_set_transform(u.pos + (Vector2(0, -hop - bob - 14) - Vector2(face * knock * 8, 0)) * MAN, -lie + swing * leg * face, Vector2(face, 1) * appear * MAN)
		draw_colored_polygon(_box(Vector2(leg * 3, 7), Vector2(7, 16), 3), C.ink * m)
	draw_set_transform(u.pos + (Vector2(0, -hop - bob - 14) - Vector2(face * knock * 8, 0)) * MAN, -lie, Vector2(face, 1) * appear * MAN)
	var flash := clampf(1.0 - (t - u.get("knock", -9.0)) / 0.12, 0, 1)
	var body := c.lerp(Color.WHITE, flash * 0.8)
	draw_colored_polygon(_box(Vector2(0, -10), Vector2(24, 26), 10), body.darkened(0.3) * m)
	draw_colored_polygon(_box(Vector2(-1, -11), Vector2(22, 24), 10), body * m)
	draw_circle(Vector2(0, -30), 10, C.skin * m)
	draw_circle(Vector2(5, -31), 1.8, C.ink * m)
	var tip := Vector2(-14 - sin(u.phase * TAU) * 3, -50)
	draw_colored_polygon(PackedVector2Array([Vector2(-11, -32), Vector2(11, -34), tip]), c.darkened(0.1) * m)
	draw_circle(tip, 3, C.cream * m)
	if u.kind == "warrior":
		var b: float = u.blow
		var reach := 0.0 if b < 0 else (-0.6 if b < 0.35 else 1.0 - (b - 0.35) / 0.65)
		var hand := Vector2(10 + reach * 10, -12)
		var dir := Vector2.from_angle(-0.9 + reach * 0.9)
		draw_line(hand, hand + dir * 24, C.steel * m, 2.5, true)
		draw_circle(hand, 4, C.skin * m)
		draw_colored_polygon(_oval(Vector2(-12, -8), Vector2(8, 10)), _team(u.side, true) * m)
		draw_arc(Vector2(-12, -8), 6, 0, TAU, 12, C.cream * m, 1.5, true)
	elif u.load:
		draw_colored_polygon(_oval(Vector2(-12, -26), Vector2(13, 12)), C.cream_d * m)
		draw_circle(Vector2(-12, -36), 5, C.cookie * m)
	draw_set_transform(Vector2.ZERO)
