extends "res://proby/stage.gd"
## Проба «Ручьи»: тянешь пальцем от своей колонии к другой — по пути течёт ручей клеток.
## Касание своей колонии — перекрыть её ручей.

const Flow := preload("res://proby/streams_sim.gd")
var sim: Flow
var _from := -1
var _trace := PackedVector2Array()
var _drawn := false  # подсказка-палец, пока игрок не провёл первый ручей
var _bump := {}  # колония -> сила «вздрагивания» после захвата


func start() -> void:
	sim = Flow.new(cfg, randi(), size, top)
	sim.event.connect(func(kind, p, side):
		if kind == "capture":
			ring(p, side, 120.0, 3.0 if side == Flow.ME or sim.colonies[sim.at(p, 0)].side == Flow.ME else 1.0)
			_bump[sim.at(p, 0)] = 1.0
		else:
			ring(p, side, 22.0, 0.0))


func tick(dt: float) -> void:
	sim.step(dt)
	power = [sim.total(Flow.ME), sim.total(Flow.FOE)]
	for k in _bump:
		_bump[k] = maxf(0.0, _bump[k] - dt * 2.5)
	if not sim.owns(Flow.FOE):
		finish("Победа!", "Все колонии твои")
	elif not sim.owns(Flow.ME):
		finish("Съели…", "Ни одной колонии не осталось", false)


func paint() -> void:
	var t := Time.get_ticks_msec() / 1000.0
	for i in sim.colonies.size():
		var c: Dictionary = sim.colonies[i]
		var r: float = sim.radius(c.mass) * (1.0 + 0.35 * _bump.get(i, 0.0))
		var breathe := 1.0 + 0.04 * sin(t * 2.2 + i)
		blobs.add(c.pos, r * 0.8 * breathe, c.side)
		var n := 5
		for k in n:  # дольки по кругу медленно плывут — капля живая, край дрожит
			var a := t * (0.4 + 0.07 * k) * (1 if i % 2 == 0 else -1) + TAU * k / n
			var o := Vector2.from_angle(a) * r * (0.45 + 0.08 * sin(t * 1.7 + k * 2.1 + i))
			blobs.add(c.pos + o, r * 0.5, c.side)
	for cell in sim.cells:  # клетка в ручье — палочка вдоль течения, слегка виляет
		var p: Vector2 = cell.p
		var j: float = cell.id * 1.7
		var ax: Vector2 = (Flow.along(cell.path, cell.d + 6.0, cell.s) - p).normalized() * 6.0
		p += ax.orthogonal() * sin(t * 6.0 + j) * 0.5
		blobs.add(p + ax, 6.5, cell.side)
		blobs.add(p - ax, 6.5, cell.side)


func paint_under() -> void:
	for c in sim.colonies:
		if c.to >= 0:
			under.draw_polyline(c.path, Color(COLORS[c.side], 0.13), 22.0, true)
	if _from >= 0 and _trace.size() > 1:
		under.draw_polyline(_trace, Color(COLORS[0], 0.35), 10.0, true)
	if not _drawn and sim.owns(Flow.ME):
		_hint()


## Подсказка без слов: пунктир от моей колонии к ближайшей ничьей бежит, по нему скользит «палец».
func _hint() -> void:
	var me: Dictionary = sim.colonies[0]
	var best: Vector2 = me.pos
	var bd := INF
	for c in sim.colonies:
		if c.side == Flow.NONE and c.pos.distance_to(me.pos) < bd:
			bd = c.pos.distance_to(me.pos)
			best = c.pos
	var t := fmod(Time.get_ticks_msec() / 1400.0, 1.0)
	under.draw_dashed_line(me.pos, best, Color(1, 1, 1, 0.25), 4.0, 14.0)
	under.draw_circle(me.pos.lerp(best, t), 26.0, Color(1, 1, 1, 0.35 * (1.0 - t)))


func paint_over() -> void:
	var f := ThemeDB.fallback_font
	for c in sim.colonies:
		var col := Color(0, 0, 0, 0.55) if c.side != Flow.NONE else Color(1, 1, 1, 0.6)
		over.draw_string(f, c.pos + Vector2(-60, 11), str(int(c.mass)), HORIZONTAL_ALIGNMENT_CENTER, 120, 30, col)


func press(p: Vector2) -> void:
	var i: int = sim.at(p)
	if i >= 0 and sim.colonies[i].side == Flow.ME:
		_from = i
		_trace = PackedVector2Array([sim.colonies[i].pos])
		ring(sim.colonies[i].pos, Flow.ME, 60.0)


func move(p: Vector2) -> void:
	if _from >= 0 and p.distance_to(_trace[-1]) > 8:
		_trace.append(p)


func release(p: Vector2) -> void:
	if _from < 0:
		return
	var to: int = sim.at(p, 60.0)
	if sim.colonies[_from].side == Flow.ME:
		if to == _from or to < 0:
			sim.set_stream(_from, -1, PackedVector2Array())  # касание своей — перекрыть ручей
		else:
			sim.set_stream(_from, to, _trace.slice(1))
			_drawn = true
			ring(sim.colonies[to].pos, Flow.ME, 70.0, 2.0)
	_from = -1
	_trace = PackedVector2Array()
