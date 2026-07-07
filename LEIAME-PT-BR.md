# 漢讀 · Hanzi Reader

> Leitor de Hanzi gratuito e com código-fonte disponível para estudar chinês através de leitura real.

[🇺🇸 Read in English](./README.md)

---

## Sobre

**漢讀 · Hanzi Reader** é uma ferramenta de leitura para estudantes de chinês que querem ler textos, livros, histórias e materiais em mandarim com suporte de estudo — sem precisar pagar assinatura mensal por funções básicas.

O projeto foi criado porque acredito que ferramentas simples para ler seus próprios textos, visualizar Pinyin, consultar palavras, ouvir pronúncia, traduzir trechos e estudar chinês deveriam ser acessíveis.

---

## Status do projeto

```text
Tipo do projeto: Código-fonte disponível
Objetivo principal: Leitura e estudo de chinês
Revenda comercial: Não permitida
Licença: PolyForm Noncommercial License 1.0.0
Autor: Sr. Hell
```

---

## Por que eu criei este projeto

Eu fiquei frustrado com aplicativos que bloqueiam funções básicas de leitura atrás de assinaturas.

Pagar mensalmente apenas para ler meus próprios livros, ver Pinyin, consultar palavras, ouvir uma pronúncia simples ou traduzir trechos não fazia sentido para mim.

Então comecei a criar meu próprio leitor: simples, direto e focado em ajudar estudantes de chinês.

O **Hanzi Reader** é uma tentativa de criar uma ferramenta prática, gratuita e acessível para estudar chinês através de leitura real.

---

## O que o Hanzi Reader faz

```mermaid
flowchart TD
    A["漢讀 · Hanzi Reader"]

    A --> B["Leitura"]
    B --> B1["Textos chineses"]
    B --> B2["Livros"]
    B --> B3["Capítulos longos"]
    B --> B4["Interface limpa de leitura"]
    B --> B5["Suporte a Pinyin"]

    A --> C["Dicionário"]
    C --> C1["Consulta de palavras"]
    C --> C2["Consulta de caracteres"]
    C --> C3["Definições"]
    C --> C4["Palavras relacionadas"]
    C --> C5["Frases de exemplo"]

    A --> D["Áudio"]
    D --> D1["Ler em voz alta"]
    D --> D2["Vozes chinesas"]
    D --> D3["Vozes do navegador"]
    D --> D4["Voz emocional experimental"]

    A --> E["Estudo"]
    E --> E1["Palavras salvas"]
    E --> E2["Área de prática"]
    E --> E3["Cartões de memorização"]
    E --> E4["Revisão"]

    A --> F["Importação"]
    F --> F1["Texto manual"]
    F --> F2["Importação por URL"]
    F --> F3["Suporte a PDF"]
    F --> F4["Fontes externas de leitura"]

    A --> G["Idioma e tradução"]
    G --> G1["Interface em português brasileiro"]
    G --> G2["Interface em inglês"]
    G --> G3["Detecção pelo idioma do navegador"]
    G --> G4["Tradução automática"]
```

---

## Principais recursos

- Leitura de textos em chinês com suporte a Pinyin.
- Importação de textos manuais.
- Importação de textos por URL.
- Suporte a leitura de PDF.
- Biblioteca local para textos, livros e capítulos.
- Interface limpa para leitura longa.
- Salvamento de palavras durante a leitura.
- Dicionário integrado.
- Consulta de palavras e caracteres chineses.
- Definições, exemplos e palavras relacionadas.
- Tradução automática de definições e trechos.
- Botão para traduzir texto selecionado.
- Leitura em voz alta.
- Suporte a vozes chinesas.
- Suporte a vozes do navegador.
- Voz emocional experimental.
- Área de prática para revisar conteúdo salvo.
- Cartões de memorização.
- Interface em português brasileiro e inglês.
- Idioma automático baseado no idioma do navegador.
- Armazenamento local dos dados no navegador.

---

## Tradução para português brasileiro

O Hanzi Reader possui suporte para tradução automática de palavras, definições e trechos selecionados.

A ideia é ajudar estudantes que estão lendo chinês, mas ainda precisam de apoio em português brasileiro para compreender melhor o conteúdo.

```mermaid
flowchart TD
    A["Usuário seleciona um trecho em chinês"] --> B["Hanzi Reader detecta o texto selecionado"]
    B --> C["O app solicita uma tradução automática"]
    C --> D["A tradução é exibida ao usuário"]
    D --> E["O usuário continua lendo com mais contexto"]

    classDef start fill:#0969da,color:#ffffff,stroke:#58a6ff,stroke-width:2px;
    classDef process fill:#161b22,color:#ffffff,stroke:#8b949e,stroke-width:1px;
    classDef result fill:#238636,color:#ffffff,stroke:#2ea043,stroke-width:2px;

    class A start;
    class B,C process;
    class D,E result;
```

A tradução funciona como apoio de estudo. Ela pode conter erros, limitações ou diferenças de sentido dependendo do contexto da frase.

---

## Fluxo de uso do app

```mermaid
flowchart TD
    A["Abrir Hanzi Reader"] --> B{"Escolher entrada"}

    B --> C["Colar texto"]
    B --> D["Importar de URL"]
    B --> E["Abrir PDF"]
    B --> F["Abrir livro salvo"]

    C --> G["Leitor"]
    D --> G
    E --> G
    F --> G

    G --> H["Ler texto em chinês"]
    H --> I["Visualizar Pinyin"]
    H --> J["Tocar em palavra ou caractere"]
    H --> K["Selecionar trecho"]

    J --> L["Abrir dicionário"]
    J --> M["Salvar palavra"]
    J --> N["Reproduzir áudio"]

    K --> O["Traduzir trecho"]
    K --> P["Ler trecho em voz alta"]

    M --> Q["Área de prática"]
    Q --> R["Revisar palavras salvas"]

    classDef input fill:#0969da,color:#ffffff,stroke:#58a6ff,stroke-width:2px;
    classDef reader fill:#8250df,color:#ffffff,stroke:#d2a8ff,stroke-width:2px;
    classDef action fill:#161b22,color:#ffffff,stroke:#8b949e,stroke-width:1px;
    classDef study fill:#238636,color:#ffffff,stroke:#2ea043,stroke-width:2px;

    class A,B,C,D,E,F input;
    class G,H,I reader;
    class J,K,L,M,N,O,P action;
    class Q,R study;
```

---

## Fluxo de estudo

```mermaid
flowchart LR
    A["Ler texto real"] --> B["Encontrar palavra nova"]
    B --> C["Consultar significado"]
    C --> D["Ouvir pronúncia"]
    D --> E["Salvar palavra"]
    E --> F["Revisar depois"]
    F --> G["Ler com mais fluidez"]

    classDef read fill:#0969da,color:#ffffff,stroke:#58a6ff,stroke-width:2px;
    classDef learn fill:#8250df,color:#ffffff,stroke:#d2a8ff,stroke-width:2px;
    classDef review fill:#238636,color:#ffffff,stroke:#2ea043,stroke-width:2px;

    class A read;
    class B,C,D,E learn;
    class F,G review;
```

---

## Jornada do usuário

```mermaid
sequenceDiagram
    participant Usuario as Usuário
    participant Leitor as Leitor
    participant Dicionario as Dicionário
    participant Audio as Áudio
    participant Traducao as Tradução
    participant Pratica as Prática

    Usuario->>Leitor: Abre um texto em chinês
    Leitor->>Usuario: Mostra Hanzi com Pinyin
    Usuario->>Dicionario: Toca em uma palavra ou caractere
    Dicionario->>Usuario: Mostra significado, Pinyin e exemplos
    Usuario->>Audio: Reproduz a pronúncia
    Usuario->>Traducao: Seleciona um trecho para traduzir
    Traducao->>Usuario: Exibe apoio em português brasileiro
    Usuario->>Pratica: Salva palavras importantes
    Pratica->>Usuario: Permite revisar depois
```

---

## Filosofia do projeto

Este projeto foi feito para ser simples, útil e acessível.

Você pode usar, estudar, modificar e compartilhar este projeto para fins pessoais, educacionais e não comerciais.

Por favor, não pegue este projeto para revender como um clone pago.

O objetivo é ajudar estudantes, não criar mais uma barreira paga para quem está tentando aprender chinês.

---

## O que este projeto é

```mermaid
graph LR
    A["Hanzi Reader"] --> B["Interface de leitura"]
    A --> C["Ferramenta de estudo"]
    A --> D["Camada de dicionário"]
    A --> E["Camada de áudio"]
    A --> F["Indexador de fontes"]
    A --> G["Área de prática"]
    A --> H["Apoio de tradução"]

    F --> I["Fontes gratuitas ou públicas"]
    F --> J["Serviços externos"]
    F --> K["Recursos de aprendizagem"]

    I -. "pertencem aos" .-> L["respectivos donos"]
    J -. "pertencem aos" .-> L
    K -. "pertencem aos" .-> L

    classDef app fill:#0969da,color:#ffffff,stroke:#58a6ff,stroke-width:2px;
    classDef layer fill:#161b22,color:#ffffff,stroke:#8b949e,stroke-width:1px;
    classDef external fill:#6e40c9,color:#ffffff,stroke:#d2a8ff,stroke-width:2px;
    classDef owner fill:#da3633,color:#ffffff,stroke:#ff7b72,stroke-width:2px;

    class A app;
    class B,C,D,E,F,G,H layer;
    class I,J,K external;
    class L owner;
```

---

## O que este projeto não é

O Hanzi Reader **não** é um clone pago.

O Hanzi Reader **não** é um produto comercial.

O Hanzi Reader **não** reivindica propriedade sobre fontes, vozes, APIs, bancos de dados, sites, bibliotecas ou materiais externos de terceiros.

O Hanzi Reader apenas fornece uma interface, leitor, camada de estudo, camada de tradução, indexação e integração para fins educacionais.

---

## Fontes e conteúdo de terceiros

Este projeto pode indexar, conectar, referenciar ou integrar recursos gratuitos, públicos ou acessíveis pelo navegador, incluindo:

- Vozes do navegador.
- Vozes do Microsoft Edge.
- Serviços de tradução.
- Fontes de estudo de chinês.
- Ferramentas de Pinyin.
- Dados de dicionário.
- Recursos de ordem de traços.
- Ferramentas de leitura de PDF.
- Fontes públicas ou gratuitas de leitura.

Eu não reivindico propriedade sobre fontes, serviços, vozes, bancos de dados, APIs, sites, bibliotecas ou conteúdos externos usados, referenciados, indexados ou integrados pelo aplicativo.

Todos os recursos de terceiros continuam pertencendo aos seus respectivos donos e estão sujeitos às suas próprias licenças, termos de uso, limites de uso, disponibilidade e restrições.

---

## Relação com fontes externas

```mermaid
flowchart TB
    A["Fontes gratuitas ou públicas de terceiros"] --> B["Indexadas ou acessadas pelo Hanzi Reader"]
    B --> C["Interface de leitura"]
    B --> D["Ferramentas de estudo"]
    B --> E["Dicionário, áudio e tradução"]

    A --> F["Pertencem aos autores ou provedores originais"]

    C --> G["Usado pelo estudante"]
    D --> G
    E --> G

    H["Hanzi Reader"] --> I["Não vende conteúdo de terceiros"]
    H --> J["Não reivindica propriedade"]
    H --> K["Fornece apenas uma camada de estudo"]

    classDef source fill:#6e40c9,color:#ffffff,stroke:#d2a8ff,stroke-width:2px;
    classDef app fill:#0969da,color:#ffffff,stroke:#58a6ff,stroke-width:2px;
    classDef learner fill:#238636,color:#ffffff,stroke:#2ea043,stroke-width:2px;
    classDef warning fill:#da3633,color:#ffffff,stroke:#ff7b72,stroke-width:2px;

    class A,F source;
    class B,C,D,E,H app;
    class G learner;
    class I,J,K warning;
```

O Hanzi Reader:

- Não vende conteúdo de terceiros.
- Não reivindica propriedade sobre conteúdo de terceiros.
- Não relicencia fontes externas.
- Não transforma fontes gratuitas em produto pago.
- Fornece apenas uma camada de estudo e leitura.

---

## Estrutura recomendada do repositório

```mermaid
graph TD
    A["Repositório"] --> B["README.md"]
    A --> C["LEIAME-PT-BR.md"]
    A --> D["LICENSE"]
    A --> E["NOTICE.md"]
    A --> F["index.html"]
    A --> G["assets/"]
    A --> H["docs/"]

    B --> B1["Explicação principal em inglês"]
    C --> C1["Explicação em português brasileiro"]
    D --> D1["Licença PolyForm Noncommercial"]
    E --> E1["Aviso sobre fontes de terceiros"]
    F --> F1["Aplicativo principal"]
    G --> G1["Ícones, imagens e arquivos estáticos"]
    H --> H1["Documentação extra"]

    classDef repo fill:#0969da,color:#ffffff,stroke:#58a6ff,stroke-width:2px;
    classDef file fill:#161b22,color:#ffffff,stroke:#8b949e,stroke-width:1px;
    classDef doc fill:#238636,color:#ffffff,stroke:#2ea043,stroke-width:2px;

    class A repo;
    class B,C,D,E,F,G,H file;
    class B1,C1,D1,E1,F1,G1,H1 doc;
```

Estrutura recomendada:

```text
hanzi-reader/
├── README.md
├── LEIAME-PT-BR.md
├── LICENSE
├── NOTICE.md
├── index.html
├── assets/
└── docs/
```

---

## Licença

Este projeto é disponibilizado sob a **PolyForm Noncommercial License 1.0.0**.

Você pode usar, estudar, modificar e compartilhar este projeto para:

- Uso pessoal.
- Uso educacional.
- Pesquisa.
- Aprendizado.
- Modificações não comerciais.
- Redistribuição não comercial com atribuição.

Você **não pode**:

- Vender este projeto.
- Revender versões modificadas.
- Revender versões não modificadas.
- Incluir este projeto em produtos pagos.
- Oferecer este projeto como serviço hospedado pago.
- Colocar este projeto atrás de uma assinatura.
- Usar este projeto comercialmente sem permissão explícita por escrito do autor.

Este projeto possui **código-fonte disponível**, mas **não está licenciado para revenda comercial**.

Veja [LICENSE](./LICENSE) e [NOTICE.md](./NOTICE.md) para mais detalhes.

---

## Aviso sobre terceiros

Leia também [NOTICE.md](./NOTICE.md).

Esse arquivo explica que o Hanzi Reader pode indexar, conectar ou integrar recursos gratuitos, públicos ou de terceiros, mas não reivindica propriedade sobre eles.

Fontes, serviços, vozes, APIs, sites, bibliotecas, dados e conteúdos de terceiros continuam pertencendo aos seus respectivos donos.

---

## Limitações

Este é um projeto pessoal de aprendizado e pode conter bugs, limitações ou recursos experimentais.

Algumas funções dependem do navegador, da conexão com a internet ou da disponibilidade de serviços externos.

Se algo parar de funcionar, pode ser causado por:

- Mudanças em serviços de terceiros.
- Bloqueios de CORS.
- Mudanças em APIs.
- Limitações do navegador.
- Indisponibilidade temporária de fontes externas.
- Alterações em serviços de tradução, voz ou leitura.

---

## Deploy

O projeto pode ser publicado como uma aplicação estática, por exemplo em serviços como Vercel, GitHub Pages ou hospedagens equivalentes.

Como o app usa recursos do navegador e pode depender de fontes externas, algumas funções podem variar conforme:

- Navegador usado.
- Sistema operacional.
- Suporte a vozes.
- Bloqueios de rede.
- Disponibilidade de serviços externos.
- Políticas de CORS das fontes acessadas.

---

## Contribuição

Sugestões, melhorias e relatos de bugs são bem-vindos.

Se você encontrar um problema, tiver uma ideia ou quiser melhorar o projeto, fique à vontade para abrir uma issue ou entrar em contato.

Por favor, mantenha o projeto não comercial e acessível.

---

## Autor

Feito por **Sr. Hell**.

Gratuito para uso pessoal, educacional e não comercial.

Por favor, não venda este projeto.
