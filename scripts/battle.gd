extends Control
## Экран партии: поле, здания, постройка и тропы касанием или перетягиванием, конец партии.

## Вид поля: картинки, размеры и цвета троп — data/look.json.
const LOOK := "res://data/look.json"
## Сдвиг пальца меньше этого — касание, а не перетягивание.
const TAP := 24.0

var sim: Sim
var look: Dictionary = JSON.parse_string(FileAccess.get_file_as_string(LOOK))
var motion := Motion.new(look.motion)
var shake := 0.0
## Подскок стола на свисток, в точках экрана.
var bump := 0.0
## Когда воин последний раз дрался (id → время): первая сшибка после затишья — со звоном.
var _fought := {}
var enemy: Enemy
## Чёрный ящик партии: флажки Романа и ход партии для разбора (scripts/blackbox.gd).
var box: BlackBox
var _sprites := {}
var _drag := {}
var _picked := {}
var _down := false
## Счётчики нажатий для строки отладки: касания, мышь, мышь из касания.
var taps := {"touch": 0, "mouse": 0, "emulated": 0}
var _last := ""
var _units := {}
var _lines := {}
## Тропа, которая после отпускания подтягивается в чистую форму: казарма и линия под пальцем.
var _settle := {}
var _loaded := []

@onready var world: Node2D = $World
@onready var things: Node2D = $World/Things
@onready var ghost: Sprite2D = $World/Ghost
@onready var buttons := {"camp": $Hud/Box/Bar/camp, "barracks": $Hud/Box/Bar/barracks, "tower": $Hud/Box/Bar/tower}
@onready var flag_button: Button = $Hud/Box/Bar/Flag
## Круг обстрела у призрака башни и подсвеченные куски чужих ниток в нём.
var _ghost_ring: Line2D
var _glow := Node2D.new()


func _ready() -> void:
	_preload(look)
	$Hud/Box/Top/Sha.text = Version.label()
	$Grass.texture = _tex(look.background)
	$Grass.modulate = Color(look.background_tint)
	for kind in buttons:
		buttons[kind].icon = _tex(look.icons[kind])
	$End/Center/Box/Again.pressed.connect(restart)
	$End/Center/Box/Send.pressed.connect($Report.quick)
	# Прозрачная кнопка страницы ложится на «Отправить разбор», когда экран итога разложен.
	$End/Center/Box/Send.item_rect_changed.connect(func(): if $End.visible: $Report.arm($End/Center/Box/Send))
	$End/Center/Box/Phrase.pressed.connect($Report.open)
	$Report.sent_out.connect(func(): $End/Center/Box/Send.text = "GitHub открыт: войди и нажми Create")
	flag_button.icon = load(look.flag.file)
	for c in ["icon_normal_color", "icon_pressed_color", "icon_hover_color", "icon_focus_color"]:  # розовый, не белый флаг «сдаюсь»
		flag_button.add_theme_color_override(c, Color(look.flag.color))
	SafeArea.apply($Hud)
	if OS.has_feature("web"):
		JavaScriptBridge.eval("window._t=0;addEventListener('touchstart',function(){window._t++},{capture:true,passive:true})")
	restart()
	_ghost_ring = _ring()
	_ghost_ring.hide()
	world.add_child(_ghost_ring)
	world.add_child(_glow)
	world.move_child(_glow, $World/Paths.get_index() + 1)


func restart() -> void:
	for c in things.get_children() + $World/Paths.get_children():
		c.free()
	_sprites.clear()
	_units.clear()
	_lines.clear()
	_drag = {}
	_pick({})
	ghost.hide()
	sim = Sim.new()
	sim.changed.connect(_on_sim)
	sim.changed.connect($Feedback.on_sim)
	enemy = Enemy.new(sim)
	box = BlackBox.new()
	sim.changed.connect(box.on_sim)
	flag_button.text = "не так"
	for b in sim.buildings:
		_on_sim("built", b)
	for d in sim.deposits:
		_add_sprite(d.id, look.deposit, _tex(look.deposit.states[0][1]), d.pos)
	$End.hide()
	$Report.disarm()


func _process(dt: float) -> void:
	enemy.step(dt)
	if sim.winner == -1: box.step(sim, dt)
	sim.step(dt)
	var field := Sim._v(sim.cfg.field)
	# Поле целиком между полоской сверху и кнопками снизу, на любом экране.
	var top: float = $Hud/Box/Top.get_global_rect().end.y + 4
	var room := Vector2(size.x, _bar_top() - 4 - top)
	var k := minf(room.x / field.x, room.y / field.y)
	world.scale = Vector2(k, k)
	world.position = Vector2((size.x - field.x * k) / 2, top + (room.y - field.y * k) / 2)
	world.position += Vector2(randf_range(-shake, shake), randf_range(-shake, shake))
	world.position.y -= bump
	shake = move_toward(shake, 0.0, dt * 40.0)
	$Hud/Box/Top/Gold.text = "Крошки %d" % sim.gold[Sim.PLAYER]
	$Hud/Box/Top/Time.text = "%d:%02d" % [int(sim.time) / 60, int(sim.time) % 60]
	# Кольцо свистка: печенье-крошка «съедается» к свистку, внутри секунды.
	$Hud/Box/Top/Whistle.value = sim.whistle / sim.cfg.whistle.every
	$Hud/Box/Top/Whistle/Left.text = str(ceili(sim.whistle))
	for kind in buttons:
		buttons[kind].modulate.a = 1.0 if sim.gold[Sim.PLAYER] >= sim.cfg.buildings[kind].cost else 0.45
	for d in sim.deposits:
		var s: Node2D = _sprites[d.id]
		s.visible = d.gold > 0
		for st in look.deposit.states:
			if d.gold / d.max > st[0]:
				s.texture = _tex(st[1])
				break
	for b in sim.buildings:
		# Прочность кружки видна креном: чем сильнее побита, тем сильнее кренится.
		if b.kind == "home":
			_sprites[b.id].rotation_degrees = look.home_tilt[mini(3, int((1.0 - b.hp / b.max_hp) * 4.0))]
		# Голодный коробок: крошек на воина нет — темнеет.
		_sprites[b.id].self_modulate = Color(0.45, 0.42, 0.4) if b.hungry else Color.WHITE
		var bar: ProgressBar = _sprites[b.id].get_node("Hp")
		bar.value = b.hp / b.max_hp * 100.0
		bar.visible = b.hp < b.max_hp
		if b.kind == "tower":
			# До свистка бледная, без крошек спит: круг гаснет, над ней Zzz; иначе счёт сбитых.
			_sprites[b.id].self_modulate.a = 1.0 if b.awake else look.tower_look.pale
			_sprites[b.id].get_node("Ring").visible = b.awake
			_sprites[b.id].get_node("Note").text = "Zzz" if b.slept else ("сбил %d" % b.get("kills", 0) if b.get("kills", 0) > 0 else "")
	if $Hud/Box/Debug.visible:
		$Hud/Box/Debug.text = debug_text()
	_sync_paths()
	_sync_units(dt)


func _sync_paths() -> void:
	var seen := {}
	for b in sim.buildings:
		var pts: Array = [b.pos] + b.route if b.kind == "barracks" else [b.pos, b.target.get("pos")]
		if pts.size() < 2 or pts[-1] == null or b.target.get("gold", 1) <= 0 or b.target.get("hp", 1) <= 0 or is_same(_drag.get("from"), b) or is_same(_settle.get("from"), b):
			continue
		seen[b.id] = true
		if not _lines.has(b.id):
			_lines[b.id] = _line(Color(look.path_colors[b.side]))
		_points(_lines[b.id], pts)
	_drop_missing(_lines, seen)


func _sync_units(dt: float) -> void:
	var seen := {}
	for u in sim.units:
		seen[u.id] = true
		if not _units.has(u.id):
			var s := Sprite2D.new()
			_fit(s, look[u.kind], _tex(look[u.kind].files[u.side]))
			motion.attach(s)
			s.position = u.pos
			things.add_child(s)
			_units[u.id] = s
			if u.kind == "warrior":
				motion.hop(s, 1, u.home.pos - u.pos)
		var sprite: Sprite2D = _units[u.id]
		# Люди нарисованы лицом влево: идёт вправо — отражаем.
		if absf(u.pos.x - sprite.position.x) > 0.01:
			sprite.flip_h = u.pos.x > sprite.position.x
		var gait: String = u.kind if u.get("carry", 0.0) <= 0 else "carrier_loaded"
		var moved: float = u.pos.distance_to(sprite.position)
		if u.kind == "warrior" and not u.go and moved < 0.01:
			# Ждут свистка — топчутся, и чем ближе свисток, тем быстрее.
			var hurry: float = lerpf(motion.cfg.fidget_max, 1.0, sim.whistle / sim.cfg.whistle.every)
			motion.walk(sprite, "fidget", 1.0, dt * hurry)
		else:
			motion.walk(sprite, gait, moved, dt)
		sprite.position = u.pos
	_drop_missing(_units, seen)


func _drop_missing(nodes: Dictionary, seen: Dictionary) -> void:
	for id in nodes.keys():
		if not seen.has(id):
			nodes[id].queue_free()
			nodes.erase(id)


## Тропа: цветная линия с тёмной каймой, чтобы читалась на дереве стола.
func _line(color: Color) -> Line2D:
	var line := _stroke(color, look.path_width)
	var edge := _stroke(Color(look.path_edge.color), look.path_edge.width)
	edge.show_behind_parent = true
	line.add_child(edge)
	$World/Paths.add_child(line)
	return line


func _stroke(color: Color, width: float) -> Line2D:
	var line := Line2D.new()
	line.width = width
	line.default_color = color
	line.begin_cap_mode = Line2D.LINE_CAP_ROUND
	line.end_cap_mode = Line2D.LINE_CAP_ROUND
	line.joint_mode = Line2D.LINE_JOINT_ROUND
	line.antialiased = true
	return line


## Отпустил — нарисованная линия за look.route_settle с плавно подтягивается в чистую форму тропы.
func _settle_line(d: Dictionary, ok: bool) -> void:
	if not _settle.is_empty():
		_settle.line.queue_free()
	_settle = d if ok else {}
	if not ok:
		d.line.queue_free()
		return
	var from := _resample(Array(d.line.points), 64)
	var to := _resample([d.from.pos] + d.from.route, 64)
	var t := create_tween()
	t.tween_method(func(k): _points(d.line, range(64).map(func(i): return from[i].lerp(to[i], k))), 0.0, 1.0, look.route_settle).set_ease(Tween.EASE_OUT).set_trans(Tween.TRANS_CUBIC)
	t.tween_callback(func():
		if is_same(_settle, d):
			_settle = {}
		d.line.queue_free())


## n точек на ломаной через равные доли длины.
static func _resample(pts: Array, n: int) -> Array:
	var c := Curve2D.new()
	for p in pts:
		c.add_point(p)
	return range(n).map(func(i): return c.sample_baked(c.get_baked_length() * i / (n - 1.0)))


## Круг обстрела башни: тонкая светлая линия радиусом tower.range.
func _ring() -> Line2D:
	var ring := _stroke(Color(look.tower_look.ring[0]), look.tower_look.ring[1])
	for i in 49:
		ring.add_point(Vector2.from_angle(TAU * i / 48.0) * sim.cfg.tower.range)
	return ring


## Куски красных ниток внутри круга призрака горят: видно, какую тропу башня перекроет.
func _glow_threads(at: Vector2) -> void:
	for c in _glow.get_children():
		c.free()
	for b in sim.of_side(Sim.ENEMY, "barracks"):
		var pts: Array = [b.pos] + b.route
		var piece := PackedVector2Array()
		for i in range(1, pts.size()):
			for k in 9:
				var p: Vector2 = pts[i - 1].lerp(pts[i], k / 8.0)
				if p.distance_to(at) <= sim.cfg.tower.range:
					piece.append(p)
				else:
					_glow_piece(piece)
					piece = PackedVector2Array()
		_glow_piece(piece)


func _glow_piece(piece: PackedVector2Array) -> void:
	if piece.size() > 1:
		var line := _stroke(Color(look.tower_look.glow[0]), look.tower_look.glow[1])
		line.points = piece
		_glow.add_child(line)


func _points(line: Line2D, pts: Array) -> void:
	line.points = PackedVector2Array(pts)
	line.get_child(0).points = line.points


## Палец на телефоне: касание и перетягивание. Берём первое пришедшее событие нажатия —
## касание, мышь или мышь, которую браузер делает из касания, — повторы того же нажатия пропускаем.
## Читаем в _input, раньше интерфейса, чтобы ничто сверху не съело касание.
func _input(e: InputEvent) -> void:
	var press: bool = (e is InputEventScreenTouch and e.index == 0) or (e is InputEventMouseButton and e.button_index == MOUSE_BUTTON_LEFT)
	if press:
		_count(e)
		if e.pressed and not _down:
			_down = true
			_press(e.position)
		elif not e.pressed and _down:
			_down = false
			if not _drag.is_empty():
				_release(e.position)
	elif ((e is InputEventScreenDrag and e.index == 0) or e is InputEventMouseMotion) and not _drag.is_empty():
		_move(e.position)


func _count(e: InputEvent) -> void:
	if not e.is_pressed():
		return
	var kind: String = "touch" if e is InputEventScreenTouch else ("emulated" if e.device == InputEvent.DEVICE_ID_EMULATION else "mouse")
	taps[kind] += 1
	var under := "поле"
	for k in buttons:
		if buttons[k].get_global_rect().has_point(e.position):
			under = "кнопка " + k
	_last = "%s %d,%d %s" % [kind, e.position.x, e.position.y, under]


## Строка отладки: окно, плотность, увеличение страницы, касания браузера и Godot, последнее нажатие.
func debug_text() -> String:
	var zoom := "-"
	var web := "-"
	if OS.has_feature("web"):
		zoom = str(JavaScriptBridge.eval("window.visualViewport?visualViewport.scale.toFixed(2):'?'"))
		web = str(JavaScriptBridge.eval("window._t"))
	var w := DisplayServer.window_get_size()
	return "окно %dx%d dpr %.1f зум %s | браузер %s касаний %d мышь %d эмул %d | %s" % [w.x, w.y, DisplayServer.screen_get_scale(), zoom, web, taps.touch, taps.mouse, taps.emulated, _last]


func _move(pos: Vector2) -> void:
	if _drag.has("from"):
		# След пальца: точка каждые route.step единиц поля.
		var at := world.to_local(pos)
		if _drag.trail.is_empty() or _drag.trail[-1].distance_to(at) >= sim.cfg.route.step:
			_drag.trail.append(at)
		# Под пальцем — живая линия ровно по пальцу, без пересчёта: чистая форма считается при отпускании.
		_points(_drag.line, [_drag.from.pos] + (_drag.trail + [at] if _drag.from.kind == "barracks" else [at]))
	elif _drag.has("flag"):
		ghost.position = world.to_local(pos)
		ghost.show()
	elif _drag.has("what"):
		if pos.distance_to(_drag.start) >= TAP:
			_drag.moved = true
		_show_ghost(pos)


func _press(pos: Vector2) -> void:
	# Отладочное меню: касание подписи версии показывает и прячет строку отладки.
	if $Hud/Box/Top/Sha.get_global_rect().has_point(pos):
		$Hud/Box/Debug.visible = not $Hud/Box/Debug.visible
		return
	if sim.winner != -1:
		return
	# Флажок: тем же жестом, что постройка, и раньше выбора, чтобы не построить по ошибке.
	if flag_button.get_global_rect().has_point(pos):
		_pick({}); _drag = {"flag": true, "start": pos}
		_fit(ghost, look.flag, load(look.flag.file)); ghost.modulate = Color(look.flag.color, 0.7)
		return
	for kind in buttons:
		if buttons[kind].get_global_rect().has_point(pos):
			_pick({})
			_drag = {"what": kind, "start": pos}
			_fit(ghost, look[kind], _tex(look[kind].files[Sim.PLAYER]))
			_show_ghost(pos)
			return
	if not _picked.is_empty():
		_drag = {"tap": true, "start": pos}
		return
	var b := sim.building_at(world.to_local(pos), Sim.PLAYER)
	if b.get("kind") in ["camp", "barracks"]:
		_drag = {"from": b, "line": _line(Color(look.path_colors[Sim.PLAYER]).lightened(0.4)), "start": pos, "trail": []}


func _release(pos: Vector2) -> void:
	var lifted := ghost.position
	ghost.hide()
	_ghost_ring.hide()
	for c in _glow.get_children():
		c.free()
	$Why.hide()
	var at := world.to_local(pos)
	var dragged: bool = _drag.has("what")
	# Увёл палец и вернул на кнопку — это отмена, а не касание кнопки.
	var tap: bool = pos.distance_to(_drag.start) < TAP and not _drag.has("moved")
	var d := _drag
	_drag = {}
	if d.has("line") and not (d.has("trail") and d.from.kind == "barracks"):
		d.line.queue_free()
	if d.has("flag"):
		put_flag(null if tap or pos.y > _bar_top() else at)
		return
	if d.has("tap"):
		d = _picked
		_pick({})
	elif tap:
		_pick(d)
		return
	if d.has("from"):
		var ok := sim.set_route(d.from, d.trail + [at]) if d.has("trail") and d.from.kind == "barracks" else sim.set_path(d.from, at)
		if d.has("trail") and d.from.kind == "barracks":
			_settle_line(d, ok)
		if not ok and (tap or d.from.pos.distance_to(at) > 60):
			hint("тяни тропу к залежи" if d.from.kind == "camp" else "тяни тропу дальше от казармы")
		return
	if (dragged and _over_button(pos)) or (not dragged and pos.y > _bar_top()):
		return
	# Перетягиванием здание встаёт там, где виден призрак (над пальцем), касанием — под пальцем.
	if dragged:
		at = lifted
	var why := sim.can_build(Sim.PLAYER, d.what, _on_table(at))
	if why != "" and dragged:
		# Причина остаётся там, где была над пальцем, и гаснет.
		$Feedback.play("error"); box.error(why)
		$Why.show()
		$Why.modulate.a = 1.0
		create_tween().tween_property($Why, "modulate:a", 0.0, 1.0).set_delay(0.6)
	elif why != "":
		hint(why)
	else:
		sim.build(Sim.PLAYER, d.what, _on_table(at))


## У края стола здание прижимается к краю, а не запрещается.
func _on_table(at: Vector2) -> Vector2:
	var field := Sim._v(sim.cfg.field)
	return at.clamp(Vector2(30, 30), field - Vector2(30, 30))


## Отпустил постройку на кнопке — отмена; над остальной нижней полосой призрак ещё на столе.
func _over_button(pos: Vector2) -> bool:
	return buttons.values().any(func(b): return b.get_global_rect().has_point(pos))


## Призрак постройки над пальцем, чтобы палец его не закрывал; нельзя — красный, причина над ним.
func _show_ghost(pos: Vector2) -> void:
	var why: Label = $Why
	ghost.position = _on_table(world.to_local(pos) - Vector2(0, look.ghost_lift))
	ghost.visible = not _over_button(pos)
	var text := sim.can_build(Sim.PLAYER, _drag.what, ghost.position) if ghost.visible else ""
	ghost.modulate = Color(1, 1, 1, 0.75) if text == "" else Color(1, 0.3, 0.3, 0.75)
	_ghost_ring.visible = ghost.visible and _drag.what == "tower"
	_ghost_ring.position = ghost.position
	if _ghost_ring.visible:
		_glow_threads(ghost.position)
	why.visible = text != ""
	why.text = text
	why.reset_size()
	why.modulate.a = 1.0
	# Над призраком, а у верхнего края — под ним; не дальше краёв экрана и не на строке крошек.
	var half: float = look[_drag.what].width * world.scale.y * 0.6
	var at := world.to_global(ghost.position) - Vector2(why.size.x / 2, why.size.y + half)
	if at.y < $Hud/Box/Top.get_global_rect().end.y:
		at.y += why.size.y + half * 2
	why.global_position = at.clamp(Vector2(8, 0), Vector2(size.x - why.size.x - 8, size.y))


## Выбор касанием: тронул кнопку или своё здание — следующее касание поля ставит здание или тропу.
func _pick(d: Dictionary) -> void:
	_picked = {}
	for kind in buttons:
		buttons[kind].self_modulate = Color.WHITE
	if d.has("what"):
		_picked = {"what": d.what}
		buttons[d.what].self_modulate = Color(1.0, 0.85, 0.3)
		hint("коснись поля, где строить", false)
	elif d.has("from"):
		_picked = {"from": d.from}
		hint("коснись залежи" if d.from.kind == "camp" else "коснись здания врага", false)


## Отметка «тут не так»: в ящик; значок на поле, только если перетянута на место; щелчок.
func put_flag(at: Variant) -> void:
	var f := box.flag(sim, at)
	flag_button.text = "не так: %d" % box.flags.size()
	if at != null:
		var s := Sprite2D.new()
		_fit(s, look.flag, load(look.flag.file))
		s.modulate = Color(look.flag.color); s.z_index = 1  # поверх печенья и построек
		s.position = at
		things.add_child(s)
		s.create_tween().tween_property(s, "modulate:a", look.flag.after, 0.5).set_delay(look.flag.show)
	$Feedback.play("path")
	hint("отмечено %s%s" % [BlackBox._clock(f.t), "" if at != null else " · тяни на стол, чтобы отметить место"], false)


func hint(text: String, error := true) -> void:
	var label: Label = $Hud/Box/Hint
	label.text = text
	if error:
		box.error(text)
		$Feedback.play("error")
	label.modulate.a = 1.0
	create_tween().tween_property(label, "modulate:a", 0.0, 1.2).set_delay(0.6)


func _on_sim(what: String, data: Dictionary) -> void:
	match what:
		"hit":
			var by: Sprite2D = _units.get(data.by)
			if by != null:
				var dir: Vector2 = (data.pos - by.position).normalized()
				if _clashing(data):
					motion.clash(by, _units.get(data.id), dir)
					shake = maxf(shake, motion.cfg.clash.shake)
					$Feedback.play("clash")
				else:
					motion.strike(by, _units.get(data.id), dir)
			elif _sprites.has(data.by):
				# Выстрел башни: короткий рывок назад от цели.
				var tw: Sprite2D = _sprites[data.by]
				var home: Vector2 = tw.get_meta("home", tw.position)
				tw.set_meta("home", home)
				tw.set_meta("size", tw.get_meta("size", tw.scale))
				var t := tw.create_tween()
				t.tween_property(tw, "position", home - (data.pos - home).normalized() * look.tower_look.recoil, 0.05)
				t.parallel().tween_property(tw, "scale", tw.get_meta("size", tw.scale) * Vector2(1.15, 0.85), 0.05)
				t.tween_property(tw, "position", home, 0.15)
				t.parallel().tween_property(tw, "scale", tw.get_meta("size", tw.scale), 0.15)
		"killed":
			motion.hop(_units.get(data.get("by")), 2)
		"whistle":
			var t := create_tween()
			t.tween_property(self, "bump", motion.cfg.table_jump.height, motion.cfg.table_jump.time / 2)
			t.tween_property(self, "bump", 0.0, motion.cfg.table_jump.time / 2)
		"built":
			var l: Dictionary = look[data.kind]
			var s := _add_sprite(data.id, l, _tex(l.files[data.side]), data.pos)
			var bar := ProgressBar.new()
			bar.name = "Hp"
			bar.show_percentage = false
			bar.size = Vector2(44, 6)
			bar.scale = Vector2.ONE / s.scale
			bar.position = Vector2(-22, -l.width * 0.4) / s.scale
			bar.hide()
			s.add_child(bar)
			if data.kind == "tower":
				var ring := _ring()
				ring.name = "Ring"
				ring.scale = Vector2.ONE / s.scale
				ring.show_behind_parent = true
				s.add_child(ring)
				var note := Label.new()
				note.name = "Note"
				note.add_theme_font_size_override("font_size", 28)
				note.add_theme_color_override("font_color", Color(look.tower_look.note))
				note.add_theme_constant_override("outline_size", 6)
				note.add_theme_color_override("font_outline_color", Color.BLACK)
				note.scale = Vector2.ONE / s.scale
				note.position = Vector2(-20, -l.width * 0.75) / s.scale
				s.add_child(note)
		"destroyed":
			_sprites[data.id].queue_free()
			_sprites.erase(data.id)
		"check":
			# Шах крупно прямо на кружке, белым с каймой цвета её хозяина: видно, чью кружку бьют.
			var shout := Label.new()
			shout.text = "ШАХ!"
			shout.add_theme_font_size_override("font_size", look.check.size)
			shout.add_theme_constant_override("outline_size", 18)
			shout.add_theme_color_override("font_outline_color", Color(look.path_colors[data.side]).darkened(0.2))
			world.add_child(shout)
			shout.position = data.pos - shout.get_minimum_size() / 2
			var t := shout.create_tween()
			t.tween_property(shout, "modulate:a", 0.0, look.check.time).set_delay(look.check.time / 2)
			t.tween_callback(shout.queue_free)
			$Feedback.play("whistle")
		"ended":
			var mate: bool = sim.mode.win == "home" and sim.of_side(1 - data.winner, "home").is_empty()
			$End/Center/Box/Title.text = ("Мат! " if mate else "") + ("Победа!" if data.winner == Sim.PLAYER else "Поражение")
			$End/Center/Box/Flags.text = "Отметки: " + box.times() if not box.flags.is_empty() else "Отметок нет. Разбор партии всё равно отправится"
			$End/Center/Box/Send.text = "Отправить разбор"
			var who := box.title(sim)
			$End/Center/Box/Who.text = "Сегодня ты %s\n%s\n%s" % [who.name, who.line, who.hint]
			$End.show()
			$Report.arm($End/Center/Box/Send)


## Первая сшибка двух воинов, которые до этого не дрались: оба отскакивают со звоном.
func _clashing(data: Dictionary) -> bool:
	var pair := sim.units.filter(func(u): return u.id in [data.by, data.id] and u.kind == "warrior").map(func(u): return u.id)
	var calm: bool = pair.size() == 2 and pair.all(func(id): return _fought.get(id, -INF) < sim.time - motion.cfg.clash.calm)
	for id in pair:
		_fought[id] = sim.time
	return calm


func _bar_top() -> float:
	return $Hud/Box/Bar.get_global_rect().position.y


func sprite_of(id: int) -> Node2D:
	return _sprites.get(id, _units.get(id))


## Все картинки стола загрузить сразу: первая загрузка картинки посреди партии (казарма, первый воин)
## давала заминку кадра в браузере телефона. Держим ссылки, чтобы кэш их не выбросил.
func _preload(v) -> void:
	if v is Dictionary or v is Array:
		for x in (v.values() if v is Dictionary else v):
			_preload(x)
	elif v is String and not v.is_empty() and ResourceLoader.exists(look.dir + v + ".png"):
		_loaded.append(_tex(v))


func _tex(file: String) -> Texture2D:
	return load(look.dir + file + ".png")


## Размер картинки по ширине из look.json; у людей точка опоры — ноги.
func _fit(s: Sprite2D, l: Dictionary, tex: Texture2D) -> void:
	s.texture = tex
	s.scale = Vector2.ONE * l.width / tex.get_width()
	s.offset.y = (0.5 - l.anchor[1]) * tex.get_height() if l.has("anchor") else 0.0


func _add_sprite(id: int, l: Dictionary, tex: Texture2D, pos: Vector2) -> Sprite2D:
	var s := Sprite2D.new()
	_fit(s, l, tex)
	s.position = pos
	things.add_child(s)
	_sprites[id] = s
	return s
