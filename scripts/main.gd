extends Control
## Стартовый экран: одна кнопка и sha в углу.

## 44 пункта iPhone при ширине экрана 390 пунктов и нашей ширине 720.
const MIN_BUTTON := 44.0 * 720.0 / 390.0

@onready var sha_label: Label = $Safe/Sha
@onready var play_button: Button = $Safe/Center/Play


func _ready() -> void:
	sha_label.text = Version.sha()
	play_button.custom_minimum_size = Vector2(ceilf(MIN_BUTTON * 4.0), ceilf(MIN_BUTTON))
	play_button.pressed.connect(func(): get_tree().change_scene_to_file("res://scenes/battle.tscn"))
	_apply_safe_area()


## Отступ от края экрана, если вырез и скругления меньше.
const EDGE := 16


func _apply_safe_area() -> void:
	var margins := $Safe as MarginContainer
	for side in ["top", "left", "right", "bottom"]:
		margins.add_theme_constant_override("margin_" + side, EDGE)
	var safe := DisplayServer.get_display_safe_area()
	var screen := DisplayServer.screen_get_size()
	if screen.x <= 0 or safe.size.x <= 0:
		return
	var k := get_viewport_rect().size.x / float(screen.x)
	margins.add_theme_constant_override("margin_top", maxi(EDGE, int(safe.position.y * k)))
	margins.add_theme_constant_override("margin_left", maxi(EDGE, int(safe.position.x * k)))
	margins.add_theme_constant_override("margin_right", maxi(EDGE, int((screen.x - safe.end.x) * k)))
	margins.add_theme_constant_override("margin_bottom", maxi(EDGE, int((screen.y - safe.end.y) * k)))
