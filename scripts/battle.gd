extends Control
## Экран партии: поле, здания, конец партии.

const TEX := {
	"home": preload("res://art/rts/medievalStructure_05.png"),
	"small": preload("res://art/rts/medievalEnvironment_17.png"),
	"rich": preload("res://art/rts/medievalEnvironment_19.png"),
}
## Цвет стороны: синие мы, красные враг.
const TINT := [Color(0.6, 0.78, 1.0), Color(1.0, 0.6, 0.55)]
const TOP := 90.0
const BOTTOM := 190.0

var sim: Sim
var _sprites := {}

@onready var world: Node2D = $World
@onready var things: Node2D = $World/Things


func _ready() -> void:
	$Hud/Box/Top/Sha.text = Version.sha()
	$End/Center/Box/Again.pressed.connect(restart)
	SafeArea.apply($Hud)
	restart()


func restart() -> void:
	for c in things.get_children():
		c.free()
	_sprites.clear()
	sim = Sim.new()
	sim.changed.connect(_on_sim)
	for b in sim.buildings:
		_on_sim("built", b)
	for d in sim.deposits:
		_add_sprite(d.id, TEX.rich if d.max >= 300 else TEX.small, d.pos)
	$End.hide()


func _process(dt: float) -> void:
	sim.step(dt)
	var field := Sim._v(sim.cfg.field)
	world.position = Vector2((size.x - field.x) / 2, TOP + (size.y - TOP - BOTTOM - field.y) / 2)
	$Hud/Box/Top/Gold.text = "Золото %d" % sim.gold[Sim.PLAYER]
	$Hud/Box/Top/Time.text = "%d:%02d" % [int(sim.time) / 60, int(sim.time) % 60]
	for d in sim.deposits:
		var s: Node2D = _sprites[d.id]
		s.visible = d.gold > 0
		s.scale = Vector2.ONE * lerpf(1.0, 2.2, d.gold / 400.0)
	for b in sim.buildings:
		var bar: ProgressBar = _sprites[b.id].get_node("Hp")
		bar.value = b.hp / b.max_hp * 100.0
		bar.visible = b.hp < b.max_hp


func _on_sim(what: String, data: Dictionary) -> void:
	match what:
		"built":
			var s := _add_sprite(data.id, TEX[data.kind], data.pos)
			s.scale = Vector2.ONE * (1.9 if data.kind == "home" else 1.5)
			s.modulate = TINT[data.side]
			var bar := ProgressBar.new()
			bar.name = "Hp"
			bar.show_percentage = false
			bar.size = Vector2(44, 6)
			bar.position = Vector2(-22, -30)
			bar.hide()
			s.add_child(bar)
		"destroyed":
			_sprites[data.id].queue_free()
			_sprites.erase(data.id)
		"ended":
			$End/Center/Box/Title.text = "Победа!" if data.winner == Sim.PLAYER else "Поражение"
			$End.show()


func _add_sprite(id: int, tex: Texture2D, pos: Vector2) -> Sprite2D:
	var s := Sprite2D.new()
	s.texture = tex
	s.position = pos
	things.add_child(s)
	_sprites[id] = s
	return s
