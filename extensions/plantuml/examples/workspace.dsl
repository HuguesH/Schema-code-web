workspace "Commerce en ligne" "Architecture de l'application de commerce" {
  model {
    customer = person "Client" "Achète des produits en ligne."

    shop = softwareSystem "Boutique en ligne" "Permet de commander des produits." {
      webApp = container "Application Web" "Interface de la boutique." "React"
      api = container "API" "Gère les commandes et le catalogue." "Node.js"
      database = container "Base de données" "Stocke les produits et commandes." "PostgreSQL"

      webApp -> api "Utilise" "HTTPS/JSON"
      api -> database "Lit et écrit" "SQL"
    }

    customer -> shop "Passe commande"
  }

  views {
    systemContext shop "context" {
      include *
      autolayout lr
    }

    container shop "containers" {
      include *
      autolayout lr
    }
  }
}
