class_name BlackBox
extends RefCounted
## Чёрный ящик партии (24.11.2026): флажки Романа и то, чего он не надиктует — ошибки, простой, тропы, потери.

## Флажки: секунда, место на поле (или null — «вот сейчас»), крошки, мои постройки и тропы.
var flags: Array = []
## Подсказки об ошибках: текст → сколько раз.
var errors := {}
var redraws := 0
var built := [0, 0]
var destroyed := [0, 0]
var lost := [0, 0]
var idle := {"camp": 0.0, "barracks": 0.0}  # простой: лагерь без залежи, казарма без тропы, с


func on_sim(what: String, data: Dictionary) -> void:
	match what:
		"built":
			built[data.side] += 1
		"destroyed":
			destroyed[data.side] += 1
		"path":
			if data.side == Sim.PLAYER:
				redraws += 1
		"killed":
			if data.get("kind") == "warrior":
				lost[data.side] += 1


func step(sim: Sim, dt: float) -> void:
	for b in sim.of_side(Sim.PLAYER):
		if b.kind in idle and _idle(b):
			idle[b.kind] += dt


func error(text: String) -> void:
	errors[text] = errors.get(text, 0) + 1


func flag(sim: Sim, pos: Variant) -> Dictionary:
	var mine := sim.of_side(Sim.PLAYER)
	var f := {"t": sim.time, "pos": pos, "gold": sim.gold[Sim.PLAYER], "mine": mine.size() - 1,
		"idle": mine.filter(func(b): return b.kind in idle and _idle(b)).size()}
	flags.append(f)
	return f


func times() -> String: return ", ".join(flags.map(func(f): return _clock(f.t)))


## Сводка для заявки: флажки по строке, затем ящик. Короткая, чтобы влезла в адрес.
func summary(sim: Sim) -> String:
	var out := ["Флажки: %d" % flags.size()]
	for f in flags:
		var at: String = "" if f.pos == null else " у (%d, %d)" % [f.pos.x, f.pos.y]
		out.append("- %s%s: крошки %d, построек %d, простаивают %d" % [_clock(f.t), at, f.gold, f.mine, f.idle])
	out.append("Что заметила игра: партия %s, %s" % [_clock(sim.time), ["идёт", "победа", "поражение"][sim.winner + 1]])
	out.append("построено %d (враг %d), разрушено моих %d, вражеских %d" % [built[0], built[1], destroyed[0], destroyed[1]])
	out.append("простой: лагеря %d с, казармы %d с; троп нарисовано %d" % [idle.camp, idle.barracks, redraws])
	out.append("воинов потеряно %d (враг %d)" % [lost[0], lost[1]])
	if not errors.is_empty():
		out.append("ошибки: " + ", ".join(errors.keys().map(func(k): return "«%s» ×%d" % [k, errors[k]])))
	return "\n".join(out)


static func _idle(b: Dictionary) -> bool:
	if b.kind == "barracks":
		return b.get("route", []).is_empty()
	return b.target.is_empty() or b.target.get("gold", 1) <= 0


static func _clock(t: float) -> String:
	return "%d:%02d" % [int(t) / 60, int(t) % 60]
