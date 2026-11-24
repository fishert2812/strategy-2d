extends Control
## Стартовый экран: варианты партии (название и одна строка правила из data/modes.json) и версия в углу.

## 44 пункта iPhone при ширине экрана 390 пунктов и нашей ширине 720.
const MIN_BUTTON := 44.0 * 720.0 / 390.0

@onready var sha_label: Label = $Safe/Sha
@onready var play_button: Button = $Safe/Center/Box/Play
@onready var modes := {"rout": play_button, "mate": $Safe/Center/Box/Mate}


func _ready() -> void:
	sha_label.text = Version.label()
	var info: Dictionary = JSON.parse_string(FileAccess.get_file_as_string(Sim.MODES))
	for m in modes:
		modes[m].text = "%s\n%s" % [info[m].title, info[m].hint]
		modes[m].custom_minimum_size = Vector2(ceilf(MIN_BUTTON * 7.0), ceilf(MIN_BUTTON * 2.2))
		modes[m].pressed.connect(start.bind(m))
	SafeArea.apply($Safe)



func start(m: String) -> void:
	Sim.chosen = m
	get_tree().change_scene_to_file("res://scenes/battle.tscn")
