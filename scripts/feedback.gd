extends Node
## Отклик на действия: звук, вспышка, дрожь здания, тряска экрана, всплывающее золото.
## Звуки — наборы Kenney (CC0), список в art/LICENSES.md.

const SOUNDS := ["path", "built", "gold", "hit", "destroyed", "win", "lose", "error"]
const FILES := {"path": "click", "built": "build", "gold": "coin", "hit": "hit", "destroyed": "crash"}
const QUIET := {"gold": -8.0, "hit": -6.0}

var played := {}
var _players := {}
@onready var battle: Control = get_parent()


func _ready() -> void:
	for what in SOUNDS:
		var p := AudioStreamPlayer.new()
		p.stream = load("res://audio/%s.ogg" % FILES.get(what, what))
		p.max_polyphony = 4
		p.volume_db = QUIET.get(what, 0.0)
		add_child(p)
		_players[what] = p


func play(what: String) -> void:
	played[what] = played.get(what, 0) + 1
	_players[what].play()


func on_sim(what: String, data: Dictionary) -> void:
	match what:
		"path", "built":
			play(what)
		"gold":
			if data.side == Sim.PLAYER:
				play("gold")
				_float("+%d" % data.amount, data.pos)
		"hit":
			play("hit")
			_flash(battle.sprite_of(data.id), data.max_hp > 0)
		"destroyed":
			play("destroyed")
			battle.shake = 16.0
		"ended":
			play("win" if data.winner == Sim.PLAYER else "lose")


## Вспышка светом; здание ещё и дрожит.
func _flash(s: Node2D, building: bool) -> void:
	if s == null:
		return
	var base := s.modulate
	var t := s.create_tween()
	t.tween_property(s, "modulate", Color(2, 2, 2), 0.05)
	t.tween_property(s, "modulate", base, 0.12)
	if building:
		var w := s.create_tween()
		w.tween_property(s, "offset:x", 3.0, 0.04)
		w.tween_property(s, "offset:x", -3.0, 0.06)
		w.tween_property(s, "offset:x", 0.0, 0.04)


func _float(text: String, pos: Vector2) -> void:
	var label := Label.new()
	label.text = text
	label.add_theme_font_size_override("font_size", 30)
	label.add_theme_color_override("font_color", Color(1, 0.85, 0.2))
	label.add_theme_constant_override("outline_size", 6)
	label.add_theme_color_override("font_outline_color", Color.BLACK)
	label.position = pos + Vector2(-16, -60)
	battle.world.add_child(label)
	var t := label.create_tween().set_parallel()
	t.tween_property(label, "position:y", label.position.y - 50, 0.8)
	t.tween_property(label, "modulate:a", 0.0, 0.8)
	t.chain().tween_callback(label.queue_free)
