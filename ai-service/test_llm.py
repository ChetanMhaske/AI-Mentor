import urllib.request
import json

def get_plan(level, time):
    req = urllib.request.Request('http://127.0.0.1:8000/lessons/plan', method='POST', headers={'Content-Type': 'application/json'})
    data = json.dumps({
        'topic': 'Photosynthesis',
        'learner_level': level,
        'language': 'en',
        'available_time_minutes': time,
        'learning_objective': 'Learn how plants make food',
        'preferred_style': 'visual'
    }).encode('utf-8')
    res = urllib.request.urlopen(req, data=data)
    return json.loads(res.read())

print('Generating beginner plan (20 min)...')
b_plan = get_plan('beginner', 20)
print('Generating advanced plan (20 min)...')
a_plan = get_plan('advanced', 20)
print('Generating 5 min plan (beginner)...')
short_plan = get_plan('beginner', 5)
print('Generating 60 min plan (beginner)...')
long_plan = get_plan('beginner', 60)

print('\n--- LEVEL COMPARISON (Beginner vs Advanced) ---')
print("Beginner Script Snippet:\n  " + b_plan['plan']['sections'][0]['explanation_script'][:200] + "...")
print("\nAdvanced Script Snippet:\n  " + a_plan['plan']['sections'][0]['explanation_script'][:200] + "...")

print('\n--- TIME COMPARISON (5 min vs 60 min) ---')
print("5 min plan sections:", len(short_plan['plan']['sections']))
print("60 min plan sections:", len(long_plan['plan']['sections']))
