extends Node2D
## Живые капли (метаболы). Каждая капля — мягкое пятно в слое вдвое меньше экрана; пятна складываются,
## шейдер blobs.gdshader режет сумму по порогу: соседние капли сливаются, ручей клеток течёт одной лентой.
## Сторона — канал цвета: 0 моя (красный), 1 враг (синий), 2 ничья (зелёный).

const CH := [Color(1, 0, 0), Color(0, 0, 1), Color(0, 1, 0)]
const EDGE := 0.57  # где пятно пересекает порог, доля радиуса пятна
var _pts := PackedVector2Array()
var _rs := PackedFloat32Array()
var _sides := PackedInt32Array()
var _layer := Node2D.new()
var _tex: ImageTexture


func setup(size: Vector2, colors: Array) -> void:
	var vp := SubViewport.new()
	vp.size = Vector2i(size / 2.0)
	vp.transparent_bg = true
	vp.disable_3d = true
	vp.render_target_update_mode = SubViewport.UPDATE_ALWAYS
	add_child(vp)
	_layer.scale = Vector2(0.5, 0.5)
	var add := CanvasItemMaterial.new()
	add.blend_mode = CanvasItemMaterial.BLEND_MODE_ADD
	_layer.material = add
	_layer.draw.connect(_paint)
	vp.add_child(_layer)
	var img := Image.create(64, 64, false, Image.FORMAT_RGBA8)
	for y in 64:
		for x in 64:
			var d := Vector2(x - 31.5, y - 31.5).length() / 32.0
			img.set_pixel(x, y, Color(1, 1, 1, pow(clampf(1.0 - d * d, 0.0, 1.0), 2.0)))
	_tex = ImageTexture.create_from_image(img)
	var show := Sprite2D.new()
	show.centered = false
	show.scale = Vector2(2, 2)
	show.texture = vp.get_texture()
	var m := ShaderMaterial.new()
	m.shader = load("res://proby/blobs.gdshader")
	for i in 3:
		m.set_shader_parameter("c%d" % i, colors[i])
	show.material = m
	add_child(show)


func add(p: Vector2, r: float, side: int) -> void:
	_pts.append(p)
	_rs.append(r / EDGE)
	_sides.append(side)


## Кадр собран: перерисовать слой и начать следующий с пустого.
func flush() -> void:
	_layer.queue_redraw()


func _paint() -> void:
	for i in _pts.size():
		var r := _rs[i]
		_layer.draw_texture_rect(_tex, Rect2(_pts[i] - Vector2(r, r), Vector2(r, r) * 2.0), false, CH[_sides[i]])
	_pts.clear()
	_rs.clear()
	_sides.clear()
