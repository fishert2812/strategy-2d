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
## Для звания (design/kto_ty_takoy.md, data/titles.json): походы, башни, голод, сон, запас.
var _titles: Dictionary = JSON.parse_string(FileAccess.get_file_as_string("res://data/titles.json"))
var first_barracks := INF
var intrude_t := INF  # первая своя постройка на половине врага
var threads := 0
var off_home := 0  # нитки казарм не на кружку
var towers := 0
var carriers := [0, 0]  # сбитые носильщики по сторонам
var hungry := 0.0
var sleepy := {}  # казарма → секунд без нитки
var rich := 0.0
var _half := 0.0
var _now := 0.0
var _last_error := {"t": -INF}
const NEAR := {"home": ["у твоей кружки", "у кружки врага"], "camp": ["у твоего лагеря", "у лагеря врага"],
	"barracks": ["у твоей казармы", "у казармы врага"]}


func on_sim(what: String, data: Dictionary) -> void:
	match what:
		"built":
			built[data.side] += 1
			if data.side == Sim.PLAYER:
				if data.kind == "barracks": first_barracks = minf(first_barracks, _now)
				if data.pos.y < _half: intrude_t = minf(intrude_t, _now)
		"destroyed":
			destroyed[data.side] += 1
		"path":
			if data.side == Sim.PLAYER:
				redraws += 1
				if data.kind == "barracks" and not data.target.is_empty():
					threads += 1; off_home += int(data.target.kind != "home")
		"killed":
			if data.get("kind") == "warrior":
				lost[data.side] += 1
			elif data.get("kind") == "carrier":
				carriers[data.side] += 1


func step(sim: Sim, dt: float) -> void:
	_now = sim.time
	_half = sim.cfg.field[1] / 2.0
	towers = maxi(towers, sim.of_side(Sim.PLAYER, "tower").size())
	rich += dt if sim.gold[Sim.PLAYER] > _titles.rich_gold else 0.0
	for b in sim.of_side(Sim.PLAYER):
		if b.kind in idle and _idle(b):
			idle[b.kind] += dt
		if b.kind == "barracks":
			hungry += dt if b.hungry else 0.0
			sleepy[b.id] = sleepy.get(b.id, 0.0) + (dt if b.route.is_empty() else 0.0)


func error(text: String) -> void:
	errors[text] = errors.get(text, 0) + 1; _last_error = {"t": _now, "text": text}


func flag(sim: Sim, pos: Variant) -> Dictionary:
	var mine := sim.of_side(Sim.PLAYER)
	var f := {"t": sim.time, "pos": pos, "gold": sim.gold[Sim.PLAYER], "mine": mine.size() - 1,
		"idle": mine.filter(func(b): return b.kind in idle and _idle(b)).size(), "where": _where(sim, pos),
		"near": "; перед этим не вышло: «%s»" % _last_error.text if sim.time - _last_error.t < 6 else ""}
	flags.append(f)
	return f


## Числа партии, по которым ставится звание.
func stats(sim: Sim) -> Dictionary:
	return {"won": int(sim.winner == Sim.PLAYER), "lost_buildings": destroyed[0], "actions": built[0] + redraws,
		"intrude_t": intrude_t, "first_barracks": first_barracks, "threads": threads, "off_home": off_home,
		"towers": towers, "carriers_killed": carriers[1], "trap": carriers[1] / maxf(1, lost[1]),
		"hungry": hungry, "sleepy": sleepy.values().max() if sleepy else 0.0, "rich_share": rich / maxf(1, sim.time)}


## Звание: первое сверху, у которого все числа в пределах; последнее подходит всегда.
func title(sim: Sim) -> Dictionary:
	var s := stats(sim)
	for t in _titles.list:
		if t.need.keys().all(func(k): return s[k] >= t.need[k][0] and s[k] <= t.need[k][1]):
			return t
	return {}


func times() -> String: return ", ".join(flags.map(func(f): return _clock(f.t)))


## Сводка для заявки человеческими словами. Короткая, чтобы влезла в адрес.
func summary(sim: Sim) -> String:
	var out := ["Партия %s, %s. Флажков: %d. Звание: %s." % [_clock(sim.time), ["ещё шла", "победа", "поражение"][sim.winner + 1], flags.size(), title(sim).name]]
	for f in flags.slice(0, 8):  # больше восьми строк не влезет в адрес заявки
		out.append("- %s %s: крошки %d, построек %d, без дела %d%s" % [_clock(f.t), f.where, f.gold, f.mine, f.idle, f.near])
	if flags.size() > 8: out.append("- и ещё флажки: " + ", ".join(flags.slice(8).map(func(f): return _clock(f.t))))
	out.append("Что заметила игра:")
	out.append("- построено у тебя %d, у врага %d; разрушено твоих %d, вражеских %d" % [built[0], built[1], destroyed[0], destroyed[1]])
	out.append("- без дела стояли: лагеря %d с, казармы %d с; троп нарисовано %d" % [idle.camp, idle.barracks, redraws])
	out.append("- воинов потеряно %d, у врага %d" % [lost[0], lost[1]])
	if not errors.is_empty(): out.append("- не вышло: " + ", ".join(errors.keys().map(func(k): return "«%s» ×%d" % [k, errors[k]])))
	return "\n".join(out)


## Место флажка словами: ближайшая постройка (своя / врага) или печенье в радиусе snap.
static func _where(sim: Sim, pos: Variant) -> String:
	if pos == null: return "(без места)"
	var all: Array = (sim.buildings + sim.deposits).filter(func(x): return x.get("gold", 1) > 0 and x.pos.distance_to(pos) <= sim.cfg.snap)
	all.sort_custom(func(a, b): return a.pos.distance_to(pos) < b.pos.distance_to(pos))
	if all.is_empty(): return "на пустом столе"
	return NEAR[all[0].kind][all[0].side] if all[0].has("kind") else "у печенья " + ["слева", "в центре", "справа"][clampi(int(pos.x * 3 / sim.cfg.field[0]), 0, 2)] + [", у врага", "", ", у тебя"][clampi(int(pos.y * 3 / sim.cfg.field[1]), 0, 2)]


static func _idle(b: Dictionary) -> bool:
	return b.get("route", []).is_empty() if b.kind == "barracks" else (b.target.is_empty() or b.target.get("gold", 1) <= 0)


static func _clock(t: float) -> String:
	return "%d:%02d" % [int(t) / 60, int(t) % 60]
