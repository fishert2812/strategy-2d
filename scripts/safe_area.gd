class_name SafeArea
## Отступы безопасной зоны (вырез, скругления) для MarginContainer, не меньше EDGE.
## Считаем от окна игры, а не от всего экрана: в браузере окно меньше экрана на панели браузера,
## и отступ «от экрана» поднимал кнопки на середину поля (урок L001).

const EDGE := 16


static func apply(margins: MarginContainer) -> void:
	var window := Rect2(DisplayServer.window_get_position(), DisplayServer.window_get_size())
	var m := insets(window, Rect2(DisplayServer.get_display_safe_area()), margins.get_viewport_rect().size.x)
	for i in 4:
		margins.add_theme_constant_override("margin_" + ["left", "top", "right", "bottom"][i], m[i])


## Отступы слева, сверху, справа, снизу в единицах игры (ширина экрана игры = width).
## Часть безопасной зоны вне окна не в счёт; отступ не больше 15 % окна.
static func insets(window: Rect2, safe: Rect2, width: float) -> Array[int]:
	var out: Array[int] = [EDGE, EDGE, EDGE, EDGE]
	if window.size.x <= 0 or safe.size.x <= 0:
		return out
	var k := width / window.size.x
	var cut := [safe.position.x - window.position.x, safe.position.y - window.position.y,
		window.end.x - safe.end.x, window.end.y - safe.end.y]
	for i in 4:
		var limit := (window.size.x if i % 2 == 0 else window.size.y) * 0.15
		out[i] = maxi(EDGE, int(clampf(cut[i], 0.0, limit) * k))
	return out
