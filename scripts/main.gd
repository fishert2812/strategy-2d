extends Control
## Стартовый экран: одна кнопка и версия (номер и sha) в углу.

## 44 пункта iPhone при ширине экрана 390 пунктов и нашей ширине 720.
const MIN_BUTTON := 44.0 * 720.0 / 390.0

@onready var sha_label: Label = $Safe/Sha
@onready var play_button: Button = $Safe/Center/Play


func _ready() -> void:
	sha_label.text = Version.label()
	play_button.custom_minimum_size = Vector2(ceilf(MIN_BUTTON * 4.0), ceilf(MIN_BUTTON))
	play_button.pressed.connect(func(): get_tree().change_scene_to_file("res://scenes/battle.tscn"))
	SafeArea.apply($Safe)

