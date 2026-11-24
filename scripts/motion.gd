class_name Motion
extends RefCounted
## Живость фигурок: работяги двигаются как фишки настольной игры.
## Только сдвиг, качание и сжатие готовой картинки; игровая точка (position) не трогается.
## Числа — data/look.json, раздел motion.

var cfg: Dictionary


func _init(c: Dictionary) -> void:
	cfg = c


## Запомнить исходный вид картинки: от него считаются все движения.
func attach(s: Sprite2D) -> void:
	s.set_meta("base_offset", s.offset)
	s.set_meta("base_scale", s.scale)
	s.set_meta("phase", 0.0)
	s.set_meta("kick", Vector2.ZERO)
	s.set_meta("pulse", 0.0)


## Шаг вприпрыжку: прыжок, приземление со сплющиванием, покачивание. moved — путь за кадр.
func walk(s: Sprite2D, gait: String, moved: float, dt: float) -> void:
	var g: Dictionary = cfg.gait[gait]
	var ph: float = s.get_meta("phase")
	ph = ph + dt * g.rate if moved > 0.01 else move_toward(ph, roundf(ph), dt * 4.0)
	s.set_meta("phase", ph)
	var up := absf(sin(ph * PI))
	var sq: float = g.squash * pow(1.0 - up, 8) + s.get_meta("pulse")
	var base: Vector2 = s.get_meta("base_scale")
	s.scale = base * Vector2(1.0 + sq, 1.0 - sq)
	s.rotation = deg_to_rad(g.sway) * cos(ph * PI) * signf(up)
	var shift: Vector2 = Vector2(0, -g.hop * up) + s.get_meta("kick")
	s.offset = s.get_meta("base_offset") + shift / base.x


## Удар: замах назад, выпад к цели; цель отлетает на шаг и сплющивается.
func strike(attacker: Sprite2D, target: Sprite2D, dir: Vector2) -> void:
	var k: Dictionary = cfg.strike
	if attacker != null and attacker.has_meta("kick"):
		var t := attacker.create_tween()
		t.tween_method(_kick.bind(attacker), Vector2.ZERO, -dir * k.windup, k.time * 0.35)
		t.tween_method(_kick.bind(attacker), -dir * k.windup, dir * k.lunge, k.time * 0.2)
		t.tween_method(_kick.bind(attacker), dir * k.lunge, Vector2.ZERO, k.time * 0.45)
	if target != null and target.has_meta("kick"):
		var t := target.create_tween().set_parallel()
		t.tween_method(_kick.bind(target), dir * k.knock, Vector2.ZERO, k.time)
		t.tween_method(_pulse.bind(target), k.squash, 0.0, k.time)


func _kick(v: Vector2, s: Sprite2D) -> void:
	s.set_meta("kick", v)


func _pulse(v: float, s: Sprite2D) -> void:
	s.set_meta("pulse", v)
