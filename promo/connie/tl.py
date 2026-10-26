# Shared timeline for the Connie promo (seconds). LINES: (clip key, speaker, start, caption parts)
# Caption parts are timed by their share of characters across the spoken clip.
FPS = 30
SCENES = [  # (id, start, end)
    (1, 0.0, 4.9), (2, 4.9, 9.6), (3, 9.6, 14.2), (4, 14.2, 20.0), (5, 20.0, 25.0), (6, 25.0, 29.4),
    (7, 29.4, 35.4), (8, 35.4, 40.6), (9, 40.6, 45.6), (10, 45.6, 50.0), (11, 50.0, 54.2), (12, 54.2, 59.6), (13, 59.6, 63.0)]
TOTAL = 63.0
LINES = [
    ('connie1', 'connie', 0.55, ['Healthy food is so expensive…', 'I don’t even know what to buy.']),
    ('comp2', 'star', 6.0, ['Hey. Let’s do this together.', 'Start with dinner.']),
    ('comp3', 'star', 10.7, ['Five things.', 'That’s all we need.']),
    ('comp4', 'star', 16.3, ['Skip that one,', 'likely blood sugar spike.', 'This one’s better.']),
    ('connie5', 'connie', 22.6, ['Oh… that’s actually easy.']),
    ('connie6', 'connie', 25.9, ['Wait.', 'That’s less than I thought.']),
    ('stranger7', 'stranger', 31.3, ['Oh! Thank you, dear.']),
    ('comp7', 'star', 33.3, ['That’s a good look on you.']),
    ('comp8', 'star', 36.9, ['Now flip it.', 'You’ve got this!']),
    ('connie9', 'connie', 42.9, ['Okay… today was good.']),
    ('comp10', 'star', 46.3, ['A few minutes of moving', 'after you eat helps.']),
]
EXTRA_CAPS = [(50.4, 53.8, 'Points in. Power up!')]
