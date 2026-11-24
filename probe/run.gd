extends SceneTree
## Запуск пробы: окно любого размера, поле 720x1280 по ширине и по центру.
var t := 0.0
func _initialize() -> void:
	var node := Node2D.new()
	var paper: Node2D = load("res://probe/paper.gd").new()
	node.add_child(paper)
	root.add_child(node)
	_node = node
var _node: Node2D
func _process(dt: float) -> bool:
	var vp := root.get_visible_rect().size
	var k := minf(vp.x / 720.0, vp.y / 1280.0)
	_node.scale = Vector2(k, k)
	_node.position = Vector2((vp.x - 720 * k) / 2, (vp.y - 1280 * k) / 2)
	t += dt
	return t > float(OS.get_environment("PROBE_SECONDS") if OS.get_environment("PROBE_SECONDS") != "" else "1000")
