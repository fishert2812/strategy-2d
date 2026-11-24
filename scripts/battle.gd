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
var enemy: Enemy
var _sprites := {}
var _drag := {}
var _picked := {}
var _down := false
## Счётчики нажатий для строки отладки: касания, мышь, мышь из касания.
var taps := {"touch": 0, "mouse": 0, "emulated": 0}
var _last := ""
var _units := {}
var _lines := {}

@onready var world: Node2D = $World
@onready var things: Node2D = $World/Things
@onready var ghost: Sprite2D = $World/Ghost
@onready var buttons := {"camp": $Hud/Box/Bar/camp, "barracks": $Hud/Box/Bar/barracks}


func _ready() -> void:
	$Hud/Box/Top/Sha.text = Version.sha()
	$Grass.texture = _tex(look.background)
	$Grass.modulate = Color(look.background_tint)
	for kind in buttons:
		buttons[kind].icon = _tex(look.icons[kind])
	$End/Center/Box/Again.pressed.connect(restart)
	SafeArea.apply($Hud)
	if OS.has_feature("web"):
		JavaScriptBridge.eval("window._t=0;addEventListener('touchstart',function(){window._t++},{capture:true,passive:true})")
	restart()


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
	for b in sim.buildings:
		_on_sim("built", b)
	for d in sim.deposits:
		_add_sprite(d.id, look.deposit, _tex(look.deposit.states[0][1]), d.pos)
	$End.hide()


func _process(dt: float) -> void:
	enemy.step(dt)
	sim.step(dt)
	var field := Sim._v(sim.cfg.field)
	# Поле целиком между полоской сверху и кнопками снизу, на любом экране.
	var top: float = $Hud/Box/Top.get_global_rect().end.y + 4
	var room := Vector2(size.x, _bar_top() - 4 - top)
	var k := minf(room.x / field.x, room.y / field.y)
	world.scale = Vector2(k, k)
	world.position = Vector2((size.x - field.x * k) / 2, top + (room.y - field.y * k) / 2)
	world.position += Vector2(randf_range(-shake, shake), randf_range(-shake, shake))
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
		# Голодный коробок: крошек на воина нет — темнеет.
		_sprites[b.id].self_modulate = Color(0.45, 0.42, 0.4) if b.hungry else Color.WHITE
		var bar: ProgressBar = _sprites[b.id].get_node("Hp")
		bar.value = b.hp / b.max_hp * 100.0
		bar.visible = b.hp < b.max_hp
	if $Hud/Box/Debug.visible:
		$Hud/Box/Debug.text = debug_text()
	_sync_paths()
	_sync_units(dt)


func _sync_paths() -> void:
	var seen := {}
	for b in sim.buildings:
		var pts: Array = [b.pos] + b.route if b.kind == "barracks" else [b.pos, b.target.get("pos")]
		if pts.size() < 2 or pts[-1] == null or b.target.get("gold", 1) <= 0 or b.target.get("hp", 1) <= 0:
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
		var sprite: Sprite2D = _units[u.id]
		# Люди нарисованы лицом влево: идёт вправо — отражаем.
		if absf(u.pos.x - sprite.position.x) > 0.01:
			sprite.flip_h = u.pos.x > sprite.position.x
		var gait: String = u.kind if u.get("carry", 0.0) <= 0 else "carrier_loaded"
		motion.walk(sprite, gait, u.pos.distance_to(sprite.position), dt)
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
	return line


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
		_points(_drag.line, [_drag.from.pos] + _drag.trail + [at])
	elif _drag.has("what"):
		ghost.position = world.to_local(pos)
		var ok: bool = sim.can_build(Sim.PLAYER, _drag.what, ghost.position) == ""
		ghost.modulate = Color(1, 1, 1, 0.7) if ok else Color(1, 0.3, 0.3, 0.7)


func _press(pos: Vector2) -> void:
	# Отладочное меню: касание подписи версии показывает и прячет строку отладки.
	if $Hud/Box/Top/Sha.get_global_rect().has_point(pos):
		$Hud/Box/Debug.visible = not $Hud/Box/Debug.visible
		return
	if sim.winner != -1:
		return
	for kind in buttons:
		if buttons[kind].get_global_rect().has_point(pos):
			_pick({})
			_drag = {"what": kind, "start": pos}
			_fit(ghost, look[kind], _tex(look[kind].files[Sim.PLAYER]))
			ghost.position = world.to_local(pos)
			ghost.show()
			return
	if not _picked.is_empty():
		_drag = {"tap": true, "start": pos}
		return
	var b := sim.building_at(world.to_local(pos), Sim.PLAYER)
	if b.get("kind") in ["camp", "barracks"]:
		_drag = {"from": b, "line": _line(Color(look.path_colors[Sim.PLAYER]).lightened(0.4)), "start": pos, "trail": []}


func _release(pos: Vector2) -> void:
	ghost.hide()
	var at := world.to_local(pos)
	var tap: bool = pos.distance_to(_drag.start) < TAP
	var d := _drag
	_drag = {}
	if d.has("line"):
		d.line.queue_free()
	if d.has("tap"):
		d = _picked
		_pick({})
	elif tap:
		_pick(d)
		return
	if d.has("from"):
		var ok := sim.set_route(d.from, d.trail + [at]) if d.has("trail") and d.from.kind == "barracks" else sim.set_path(d.from, at)
		if not ok and (tap or d.from.pos.distance_to(at) > 60):
			hint("тяни тропу к залежи" if d.from.kind == "camp" else "тяни тропу дальше от казармы")
		return
	if pos.y > _bar_top():
		return
	var why := sim.can_build(Sim.PLAYER, d.what, at)
	if why != "":
		hint(why)
	else:
		sim.build(Sim.PLAYER, d.what, at)


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


func hint(text: String, error := true) -> void:
	var label: Label = $Hud/Box/Hint
	label.text = text
	if error:
		$Feedback.play("error")
	label.modulate.a = 1.0
	create_tween().tween_property(label, "modulate:a", 0.0, 1.2).set_delay(0.6)


func _on_sim(what: String, data: Dictionary) -> void:
	match what:
		"hit":
			var by: Sprite2D = _units.get(data.by)
			if by != null:
				motion.strike(by, _units.get(data.id), (data.pos - by.position).normalized())
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
		"destroyed":
			_sprites[data.id].queue_free()
			_sprites.erase(data.id)
		"ended":
			$End/Center/Box/Title.text = "Победа!" if data.winner == Sim.PLAYER else "Поражение"
			$End.show()


func _bar_top() -> float:
	return $Hud/Box/Bar.get_global_rect().position.y


func sprite_of(id: int) -> Node2D:
	return _sprites.get(id, _units.get(id))


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
