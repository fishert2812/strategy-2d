class_name SafeArea
## Отступы безопасной зоны (вырез, скругления) для MarginContainer, не меньше EDGE.

const EDGE := 16


static func apply(margins: MarginContainer) -> void:
	for side in ["top", "left", "right", "bottom"]:
		margins.add_theme_constant_override("margin_" + side, EDGE)
	var safe := DisplayServer.get_display_safe_area()
	var screen := DisplayServer.screen_get_size()
	if screen.x <= 0 or safe.size.x <= 0:
		return
	var k := margins.get_viewport_rect().size.x / float(screen.x)
	margins.add_theme_constant_override("margin_top", maxi(EDGE, int(safe.position.y * k)))
	margins.add_theme_constant_override("margin_left", maxi(EDGE, int(safe.position.x * k)))
	margins.add_theme_constant_override("margin_right", maxi(EDGE, int((screen.x - safe.end.x) * k)))
	margins.add_theme_constant_override("margin_bottom", maxi(EDGE, int((screen.y - safe.end.y) * k)))
