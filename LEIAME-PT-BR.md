# 漢讀 · Hanzi Reader

> Leitor de Hanzi gratuito e com código-fonte disponível para estudar chinês através de leitura real.

[🇺🇸 Read in English](./README.md)

**漢讀 · Hanzi Reader** é uma ferramenta de leitura para pessoas que querem ler textos, livros, histórias e materiais em mandarim com suporte útil para estudo — sem precisar pagar assinatura mensal por funções básicas.

Este projeto foi criado porque acredito que ferramentas simples para ler seus próprios livros, adicionar pinyin, consultar palavras, ouvir pronúncia e estudar chinês deveriam ser acessíveis.

---

## Status

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

Pagar mensalmente apenas para ler meus próprios livros, ver pinyin, consultar palavras ou ouvir uma pronúncia simples não fazia sentido para mim.

Então comecei a criar meu próprio leitor — simples, direto e focado em ajudar estudantes de chinês.

Hanzi Reader é minha tentativa de criar uma ferramenta prática, gratuita e acessível para estudar chinês através de leitura real.

---

## O que o Hanzi Reader faz

```mermaid
mindmap
  root((漢讀 Hanzi Reader))
    Leitura
      Textos chineses
      Livros
      Capítulos longos
      Interface de leitura limpa
      Suporte a Pinyin
    Dicionário
      Consulta de palavras
      Consulta de caracteres
      Definições
      Palavras relacionadas
      Frases de exemplo
    Áudio
      Ler em voz alta
      Vozes chinesas
      Vozes do navegador
      Voz emocional experimental
    Estudo
      Palavras salvas
      Área de prática
      Cartões de memorização
      Revisão
    Importação
      Texto manual
      Importação por URL
      Suporte a PDF
      Fontes externas de leitura
    Idioma
      Interface em português brasileiro
      Interface em inglês
      Detecção pelo idioma do navegador
      Suporte a tradução
```

---

## Principais recursos

- Leitura de textos em chinês com suporte a pinyin
- Importação de texto manualmente ou por URL
- Leitura de livros, capítulos e textos longos em uma interface limpa
- Salvamento de palavras durante a leitura
- Dicionário integrado
- Definições de palavras e suporte a tradução automática
- Texto para fala / leitura em voz alta
- Opções de vozes chinesas
- Modos experimentais de voz emocional
- Área de prática para revisar conteúdo salvo
- Suporte de interface em português brasileiro e inglês
- Idioma automático baseado no idioma do navegador
- Armazenamento local dos dados no navegador
- Suporte à leitura de PDF
- Indexação / integração de fontes externas para fins de estudo

---

## Fluxo do aplicativo

```mermaid
flowchart TD
    A[Abrir Hanzi Reader] --> B{Escolher entrada}
    B --> C[Colar texto]
    B --> D[Importar de URL]
    B --> E[Abrir PDF]
    B --> F[Usar livro salvo]

    C --> G[Leitor]
    D --> G
    E --> G
    F --> G

    G --> H[Ler texto em chinês]
    H --> I[Mostrar pinyin]
    H --> J[Tocar em palavra ou caractere]
    H --> K[Selecionar texto]

    J --> L[Dicionário]
    J --> M[Salvar palavra]
    J --> N[Reproduzir áudio]

    K --> O[Traduzir seleção]
    K --> P[Ler em voz alta]

    M --> Q[Prática]
    Q --> R[Revisar palavras salvas]
```

---

## Fluxo de estudo

```mermaid
sequenceDiagram
    participant Usuario
    participant Leitor
    participant Dicionario
    participant Audio
    participant Traducao
    participant Pratica

    Usuario->>Leitor: Abre um texto em chinês
    Leitor->>Leitor: Exibe Hanzi com pinyin
    Usuario->>Dicionario: Toca em uma palavra ou caractere
    Dicionario->>Usuario: Mostra significado, pinyin e exemplos
    Usuario->>Audio: Reproduz a pronúncia
    Usuario->>Traducao: Traduz o texto selecionado
    Traducao->>Usuario: Mostra apoio de tradução
    Usuario->>Pratica: Salva palavras úteis
    Pratica->>Usuario: Revisa o vocabulário depois
```

---

## Filosofia do projeto

Este projeto foi feito para permanecer simples, útil e acessível.

Você pode usar, estudar, modificar e melhorar este projeto para fins pessoais, educacionais e não comerciais.

Por favor, não pegue este projeto e revenda como um clone pago.

O objetivo é ajudar estudantes, não criar mais uma barreira paga.

---

## O que este projeto é

```mermaid
graph LR
    A[Hanzi Reader] --> B[Interface de leitura]
    A --> C[Auxiliar de estudo]
    A --> D[Camada de dicionário]
    A --> E[Camada de áudio]
    A --> F[Camada de tradução]
    A --> G[Indexador de fontes]
    A --> H[Ferramenta de prática]

    G --> I[Fontes gratuitas/públicas]
    G --> J[Serviços externos]
    G --> K[Recursos de aprendizagem]

    I -.pertencem aos.-> L[Respectivos donos]
    J -.pertencem aos.-> L
    K -.pertencem aos.-> L
```

---

## O que este projeto não é

Hanzi Reader **não** é um clone pago.

Hanzi Reader **não** é um produto comercial.

Hanzi Reader **não** reivindica propriedade sobre fontes, vozes, APIs, bancos de dados, sites ou materiais de estudo de terceiros.

Hanzi Reader fornece apenas um leitor, interface, camada de estudo, camada de tradução, indexação e integração para fins de aprendizagem.

---

## Fontes e conteúdo de terceiros

Este projeto pode indexar, conectar, referenciar ou integrar recursos gratuitos/públicos de terceiros e serviços acessíveis pelo navegador, incluindo:

- Vozes do navegador / Microsoft Edge
- Serviços de tradução
- Fontes de estudo de chinês
- Ferramentas de pinyin
- Dados de dicionário
- Recursos de ordem de traços
- Ferramentas de leitura de PDF
- Fontes públicas ou gratuitas de leitura

Eu não reivindico propriedade sobre fontes, serviços, vozes, bancos de dados, APIs, sites, bibliotecas ou conteúdos externos usados, referenciados, indexados ou integrados pelo aplicativo.

Todos os recursos de terceiros permanecem propriedade de seus respectivos donos e estão sujeitos às suas próprias licenças, termos de uso, limites de uso, disponibilidade e restrições.

---

## Relação com as fontes

```mermaid
flowchart TB
    A[Fontes gratuitas/públicas de terceiros] --> B[Indexadas ou acessadas pelo Hanzi Reader]
    B --> C[Interface de leitura]
    B --> D[Ferramentas de estudo]
    B --> E[Dicionário / áudio / tradução]

    A --> F[Propriedade dos autores/provedores originais]
    C --> G[Usado pelo estudante]
    D --> G
    E --> G

    H[Hanzi Reader] --> I[Não vende conteúdo de terceiros]
    H --> J[Não reivindica propriedade]
    H --> K[Fornece apenas uma interface de estudo]
```

---

## Estrutura do repositório

```mermaid
graph TD
    A[Repositório] --> B[README.md]
    A --> C[LEIAME-PT-BR.md]
    A --> D[LICENSE]
    A --> E[NOTICE.md]
    A --> F[index.html]
    A --> G[assets/]
    A --> H[docs/]

    B --> B1[Explicação do projeto em inglês]
    C --> C1[Leia-me em português brasileiro]
    D --> D1[Referência PolyForm Noncommercial]
    E --> E1[Aviso sobre fontes de terceiros]
    F --> F1[Aplicativo principal]
    G --> G1[Ícones / imagens / arquivos estáticos]
    H --> H1[Documentação extra]
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

- Uso pessoal
- Uso educacional
- Pesquisa
- Aprendizado
- Modificação não comercial
- Redistribuição não comercial com atribuição

Você **não pode**:

- Vender este projeto
- Revender versões modificadas
- Revender versões não modificadas
- Incluir este projeto em produtos pagos
- Oferecer este projeto como serviço hospedado pago
- Colocar este projeto atrás de uma assinatura
- Usar este projeto comercialmente sem permissão explícita por escrito do autor

Este projeto possui **código-fonte disponível**, mas **não está licenciado para revenda comercial**.

Veja [LICENSE](./LICENSE) e [NOTICE.md](./NOTICE.md) para mais detalhes.

---

## NOTICE

Leia também o arquivo [NOTICE.md](./NOTICE.md).

Esse arquivo explica que Hanzi Reader pode indexar, conectar ou integrar recursos gratuitos/públicos de terceiros, mas não reivindica propriedade sobre eles.

As fontes de terceiros permanecem propriedade de seus respectivos donos.

---

## Aviso

Este é um projeto pessoal de aprendizado e pode conter bugs, limitações ou recursos experimentais.

Alguns serviços usados pelo aplicativo podem depender do suporte do navegador, acesso à rede ou disponibilidade de terceiros.

Se algo parar de funcionar, pode ter sido causado por mudanças em serviços externos.

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
