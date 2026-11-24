extends Node2D
## Общая основа трёх проб: тёмная чашка, слой живых капель, вспышки и тряска, 
## полоса силы сторон сверху и конец партии. Проба наследует и задаёт press/move/release, tick, paint.

const COLORS := [Color(0.25, 1.0, 0.78), Color(1.0, 0.3, 0.5), Color(0.5, 0.52, 0.62)]
var cfg: Dictionary
var size: Vector2
var top := 120.0  # ниже выреза iPhone
var blobs := preload("res://proby/blobs.gd").new()
var fon: ColorRect
var under := Node2D.new()
var over := Node2D.new()
var power := [1.0, 1.0]  # для полосы сверху
var over_text := ""
var over_sub := ""
var show_bar := true
var colors: Array = COLORS
var _rings: Array = []  # [pos, возраст, цвет, радиус]
var _shake := 0.0
var _down := false
var _hud := CanvasLayer.new()
var _end := Control.new()


func _ready() -> void:
	var all = JSON.parse_string(FileAccess.get_file_as_string("res://proby/proby.json"))
	cfg = all[name.to_lower()] if all is Dictionary and all.has(name.to_lower()) else {}
	size = get_viewport_rect().size
	start()
	fon = ColorRect.new()
	fon.size = size
	fon.material = ShaderMaterial.new()
	fon.material.shader = load("res://proby/fon.gdshader")
	fon.material.set_shader_parameter("size", size)
	add_child(fon)
	add_child(under)
	blobs.setup(size, colors)
	add_child(blobs)
	add_child(over)
	under.draw.connect(paint_under)
	over.draw.connect(_over)
	add_child(_hud)
	_end.visible = false
	_end.size = size
	_hud.add_child(_end)
	var again := _button("Ещё раз", Vector2(size.x / 2 - 170, size.y * 0.58), Vector2(340, 110), _end)
	again.pressed.connect(get_tree().reload_current_scene)


func _button(text: String, pos: Vector2, sz: Vector2, parent: Node = _hud) -> Button:
	var b := Button.new()
	b.text = text
	b.position = pos
	b.size = sz
	b.add_theme_font_size_override("font_size", 44)
	b.focus_mode = Control.FOCUS_NONE
	parent.add_child(b)
	return b


func _process(dt: float) -> void:
	if not _end.visible:
		tick(dt)
	paint()
	blobs.flush()
	for r in _rings:
		r[1] += dt
	_rings = _rings.filter(func(r): return r[1] < 0.6)
	_shake = maxf(0.0, _shake - dt * 30.0)
	position = Vector2(randf_range(-1, 1), randf_range(-1, 1)) * _shake
	under.queue_redraw()
	over.queue_redraw()


## Вспышка-кольцо и встряска экрана: отклик на захват, удар, касание.
func ring(p: Vector2, side: int, r := 90.0, shake := 0.0) -> void:
	_rings.append([p, 0.0, colors[side], r])
	_shake = maxf(_shake, shake)


func finish(title: String, sub := "", good := true) -> void:
	over_text = title
	over_sub = sub
	_end.visible = true
	ring(size / 2, 0 if good else 1, 600.0, 4.0)


func _over() -> void:
	for r in _rings:
		var k: float = r[1] / 0.6
		over.draw_arc(r[0], r[3] * (0.3 + k), 0, TAU, 48, Color(r[2], 0.8 * (1.0 - k)), 6.0 * (1.0 - k) + 1.0)
	paint_over()
	var f := ThemeDB.fallback_font
	var total: float = maxf(1.0, power[0] + power[1])
	var w := size.x - 160.0
	if show_bar:
		over.draw_rect(Rect2(80, top - 64, w * power[0] / total, 14), COLORS[0])
		over.draw_rect(Rect2(80 + w * power[0] / total, top - 64, w * power[1] / total, 14), COLORS[1])
	over.draw_string(f, Vector2(size.x - 420, size.y - 24), "Ручьи · проба · " + _sha(), HORIZONTAL_ALIGNMENT_RIGHT, 400, 20, Color(1, 1, 1, 0.3))
	if over_text != "":
		over.draw_rect(Rect2(Vector2.ZERO, size), Color(0, 0, 0, 0.45))
		over.draw_string(f, Vector2(0, size.y * 0.4), over_text, HORIZONTAL_ALIGNMENT_CENTER, size.x, 84, Color.WHITE)
		over.draw_multiline_string(f, Vector2(40, size.y * 0.4 + 70), over_sub, HORIZONTAL_ALIGNMENT_CENTER, size.x - 80, 34, -1, Color(1, 1, 1, 0.75))


func _sha() -> String:
	return FileAccess.get_file_as_string("res://version.txt").strip_edges() if FileAccess.file_exists("res://version.txt") else "dev"


## Палец: первое нажатие (касание или мышь, которую браузер делает из касания), повторы пропускаем.
func _input(e: InputEvent) -> void:
	if _end.visible:
		return
	if (e is InputEventScreenTouch and e.index == 0) or (e is InputEventMouseButton and e.button_index == MOUSE_BUTTON_LEFT):
		if e.pressed and not _down and e.position.y > top - 10:
			_down = true
			press(e.position)
		elif not e.pressed and _down:
			_down = false
			release(e.position)
	elif _down and ((e is InputEventScreenDrag and e.index == 0) or e is InputEventMouseMotion):
		move(e.position)


func start() -> void: pass
func tick(_dt: float) -> void: pass
func paint() -> void: pass
func paint_under() -> void: pass
func paint_over() -> void: pass
func press(_p: Vector2) -> void: pass
func move(_p: Vector2) -> void: pass
func release(_p: Vector2) -> void: pass
