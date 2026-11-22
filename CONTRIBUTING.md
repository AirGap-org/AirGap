# Contribuer à AirGap

## Source de vérité

Le dépôt officiel est **GitLab** :

- Code : https://gitlab.com/Akahira/AirGap
- Issues : https://gitlab.com/Akahira/AirGap/-/issues
- Merge requests : https://gitlab.com/Akahira/AirGap/-/merge_requests

GitHub n'est conservé que comme archive historique. Les contributions, issues et
pipelines se font exclusivement sur GitLab.

## Workflow

1. Créer une branche depuis `master` :
   ```bash
   git switch master
   git pull --ff-only
   git switch -c feat/mon-sujet
   ```
2. Développer et tester localement.
3. Ouvrir une **merge request** vers `master`.
4. Attendre le pipeline GitLab et une revue.
5. Merger uniquement si le pipeline est vert.

Les pushes directs sur `master` sont réservés aux mainteneurs et aux hotfixes
exceptionnels. Le déploiement en production se fait uniquement via un tag `v*`
et un job manuel.

## Commits

Format recommandé : [Conventional Commits](https://www.conventionalcommits.org/).

```text
fix(auth): réparer le changement d'email (IA)
feat(accounts): ajouter les comptes multiples (IA)
ci: ajouter le pipeline GitLab (IA)
docs: documenter la source de vérité GitLab (IA)
```

Tout commit, MR ou patch généré ou assisté par IA doit être suffixé `(IA)`.
Les commits existants suffixés `(AI)` sont historiques et ne doivent pas être
renommés.

## Tests

```bash
npm run lint
npm run typecheck
npm test
npm run build
```

Les tests d'intégration vident la base ciblée. Utiliser une base dédiée dont le
nom finit par `_test`, `_preview` ou `_ci`.

## CI/CD

Le pipeline GitLab exécute :

- lint, typecheck, audit et build ;
- tests avec PostgreSQL ;
- build de l'image Docker sur `master` et sur les tags ;
- déploiement **manuel** sur tag.

Les images de production sont publiées dans le registry GitLab :

- `registry.gitlab.com/akahira/airgap`
- `registry.gitlab.com/akahira/airgap-ai`

## Sécurité

- Ne jamais commiter de secret, clé privée, token ou fichier `.env`.
- Les variables de production sont définies dans GitLab CI/CD et protégées.
- Les vulnérabilités doivent être signalées en privé au mainteneur, pas dans une
  issue publique.

## Service IA

Le service `AirGap-AI` est un projet GitLab séparé. Il est joint par le réseau
Docker interne `airgap_ai_net` et ne doit pas être exposé publiquement.
