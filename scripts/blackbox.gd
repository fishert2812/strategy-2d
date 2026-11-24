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
var _now := 0.0
var _last_error := {"t": -INF}
const NEAR := {"home": ["у твоей кружки", "у кружки врага"], "camp": ["у твоего лагеря", "у лагеря врага"],
	"barracks": ["у твоей казармы", "у казармы врага"]}


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
	_now = sim.time
	for b in sim.of_side(Sim.PLAYER):
		if b.kind in idle and _idle(b):
			idle[b.kind] += dt


func error(text: String) -> void:
	errors[text] = errors.get(text, 0) + 1; _last_error = {"t": _now, "text": text}


func flag(sim: Sim, pos: Variant) -> Dictionary:
	var mine := sim.of_side(Sim.PLAYER)
	var f := {"t": sim.time, "pos": pos, "gold": sim.gold[Sim.PLAYER], "mine": mine.size() - 1,
		"idle": mine.filter(func(b): return b.kind in idle and _idle(b)).size(), "where": _where(sim, pos),
		"near": "; перед этим не вышло: «%s»" % _last_error.text if sim.time - _last_error.t < 6 else ""}
	flags.append(f)
	return f


func times() -> String: return ", ".join(flags.map(func(f): return _clock(f.t)))


## Сводка для заявки человеческими словами. Короткая, чтобы влезла в адрес.
func summary(sim: Sim) -> String:
	var out := ["Партия %s, %s. Флажков: %d." % [_clock(sim.time), ["ещё шла", "победа", "поражение"][sim.winner + 1], flags.size()]]
	for f in flags:
		out.append("- %s %s: у тебя %d крошек, построек %d, без дела %d%s" % [_clock(f.t), f.where, f.gold, f.mine, f.idle, f.near])
	out.append("Что заметила игра:")
	out.append("- построено у тебя %d, у врага %d; разрушено твоих %d, вражеских %d" % [built[0], built[1], destroyed[0], destroyed[1]])
	out.append("- без дела стояли: лагеря %d с, казармы %d с; троп нарисовано %d" % [idle.camp, idle.barracks, redraws])
	out.append("- воинов потеряно %d, у врага %d" % [lost[0], lost[1]])
	if not errors.is_empty():
		out.append("- не вышло: " + ", ".join(errors.keys().map(func(k): return "«%s» ×%d" % [k, errors[k]])))
	return "\n".join(out)


## Место флажка словами: ближайшая постройка (своя / врага) или печенье в радиусе snap.
static func _where(sim: Sim, pos: Variant) -> String:
	if pos == null: return "(без места)"
	var all: Array = (sim.buildings + sim.deposits).filter(func(x): return x.get("gold", 1) > 0 and x.pos.distance_to(pos) <= sim.cfg.snap)
	all.sort_custom(func(a, b): return a.pos.distance_to(pos) < b.pos.distance_to(pos))
	if all.is_empty(): return "на пустом столе"
	return NEAR[all[0].kind][all[0].side] if all[0].has("kind") else "у печенья"


static func _idle(b: Dictionary) -> bool:
	if b.kind == "barracks":
		return b.get("route", []).is_empty()
	return b.target.is_empty() or b.target.get("gold", 1) <= 0


static func _clock(t: float) -> String:
	return "%d:%02d" % [int(t) / 60, int(t) % 60]
