import json
from pathlib import Path

analysis = json.loads(Path('.graphify_analysis.json').read_text())
extract = json.loads(Path('.graphify_extract.json').read_text())

id_to_label = {n['id']: n['label'] for n in extract['nodes']}
communities = {int(k): v for k, v in analysis['communities'].items()}
cohesion = {int(k): v for k, v in analysis['cohesion'].items()}

# Show top communities by size
by_size = sorted(communities.items(), key=lambda x: len(x[1]), reverse=True)
for cid, members in by_size[:20]:
    labels = [id_to_label.get(m, m) for m in members[:6]]
    coh = cohesion.get(cid, 0)
    print(f'Community {cid:3d} (n={len(members):3d}, coh={coh:.2f}): {", ".join(labels[:5])}')
