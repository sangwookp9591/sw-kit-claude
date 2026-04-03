---
name: spring-boot
description: "Spring Boot + DDD 아키텍처 가이드. 프로젝트가 Spring Boot면 backend 작업 시 자동 적용. DDD 패키지 구조 + Best Practices 강제."
triggers: ["spring boot", "springboot", "spring", "스프링", "java backend", "자바 백엔드"]
auto_detect: ["pom.xml", "build.gradle", "build.gradle.kts", "src/main/java"]
---

# /aing:spring-boot — Spring Boot DDD Architecture Guide

Spring Boot 프로젝트에서 backend 작업 시 자동 적용되는 아키텍처 + best practices 가이드.

## Auto-Detection

프로젝트 루트에 아래 파일이 존재하면 Spring Boot 프로젝트로 판단하고 이 스킬을 자동 적용:
- `pom.xml` (Maven)
- `build.gradle` / `build.gradle.kts` (Gradle)
- `src/main/java/` 디렉토리

Jay 에이전트가 backend 코드를 생성/수정할 때 이 스킬의 규칙을 따른다.

---

## DDD Package Structure (Mandatory)

새 도메인/기능 추가 시 아래 구조를 따른다. 기존 프로젝트에 이 구조가 있으면 일관성 유지.

```
com.{company}.{project}.{domain}/
├── application/                    # Application Service Layer
│   ├── command/                   # Input Command DTO (record)
│   ├── result/                    # Output Result DTO (record)
│   └── usecase/                   # UseCase interface + implementation
│       └── {feature}/impl/
├── domain/                         # Domain Layer (Core Business)
│   ├── aggregate/                 # Aggregate Root entities
│   ├── repository/                # Repository Port (interface only)
│   └── shared/enums/              # Shared domain enums
├── infrastructure/                 # Infrastructure Layer (Adapters)
│   ├── external/                  # External service adapters
│   │   └── {service}/            # e.g., qrcode/, s3/, payment/
│   └── persistence/              # Persistence
│       ├── adapter/              # Repository implementation
│       └── mybatis/              # MyBatis mapper (or jpa/)
├── interfaces/                     # Presentation Layer
│   ├── api/{role}/               # REST controllers (admin/, user/, public/)
│   ├── dto/{role}/               # Request/Response DTO
│   │   ├── request/
│   │   └── response/
│   └── mapper/                   # Interface mapper (DTO <-> Command/Result)
└── support/                        # Cross-cutting Concerns
    ├── exception/                # Error codes + exception classes
    └── util/                     # Utilities
```

### Layer Rules

| Layer | Depends On | Never Depends On |
|-------|-----------|-----------------|
| domain | nothing (pure) | application, infrastructure, interfaces |
| application | domain | infrastructure, interfaces |
| infrastructure | domain, application | interfaces |
| interfaces | application | domain (directly), infrastructure |
| support | nothing | all layers can use support |

### Naming Conventions

| Component | Pattern | Example |
|-----------|---------|---------|
| Aggregate | `{Name}.java` | `Order.java`, `QrCode.java` |
| Repository Port | `{Name}Repository.java` (interface) | `OrderRepository.java` |
| Repository Impl | `{Name}RepositoryAdapter.java` | `OrderRepositoryAdapter.java` |
| UseCase Interface | `{Action}{Name}UseCase.java` | `CreateOrderUseCase.java` |
| UseCase Impl | `{Action}{Name}UseCaseImpl.java` | `CreateOrderUseCaseImpl.java` |
| Command | `{Action}{Name}Command.java` (record) | `CreateOrderCommand.java` |
| Result | `{Name}Result.java` (record) | `OrderResult.java` |
| Controller | `{Role}{Name}Controller.java` | `AdminOrderController.java` |
| Request DTO | `{Action}{Name}Request.java` (record) | `CreateOrderRequest.java` |
| Response DTO | `{Name}Response.java` (record) | `OrderResponse.java` |
| Mapper | `{Name}DtoMapper.java` | `OrderDtoMapper.java` |
| Exception | `{Name}Exception.java` | `OrderNotFoundException.java` |
| Error Code | `{Domain}ErrorCode.java` (enum) | `OrderErrorCode.java` |

---

## Best Practices

### Dependency Injection
- Constructor Injection only (`private final` fields)
- `@RequiredArgsConstructor` (Lombok) 또는 explicit constructor
- Field injection (`@Autowired` on field) 금지

### Configuration
- `application.yml` 사용 (properties 대신)
- `@ConfigurationProperties` 로 type-safe binding
- Profile 분리: `application-{env}.yml`
- Secret hardcoding 금지 — 환경변수 또는 Vault

### Controller (interfaces layer)
- `@RestController` + `@RequestMapping`
- Request/Response DTO 사용 — Entity 직접 노출 금지
- `@Valid` 로 입력 검증 (JSR 380)
- `@ControllerAdvice` + `@ExceptionHandler` 로 global error handling

### UseCase (application layer)
- UseCase interface로 정의, impl에서 구현
- `@Transactional` 은 UseCase impl에 적용
- Stateless
- Domain object를 직접 반환하지 않음 — Result DTO로 변환

### Domain (domain layer)
- Pure Java — Spring 의존성 금지
- Repository는 interface만 (port)
- Business logic은 Aggregate 내부에
- Enum은 `shared/enums/` 에 집중

### Persistence (infrastructure layer)
- Repository interface의 구현체 = Adapter
- `@Repository` annotation
- MyBatis: Mapper interface + XML
- JPA: `@Entity` 는 infrastructure에 위치 (domain aggregate와 분리 가능)

### Logging
- SLF4J + `@Slf4j` (Lombok)
- Parameterized: `log.info("Processing order {}", orderId)`
- String concatenation 금지

### Testing
- Unit: JUnit 5 + Mockito
- Integration: `@SpringBootTest`
- Slice: `@WebMvcTest`, `@DataJpaTest`, `@MyBatisTest`
- Testcontainers 권장 (DB integration)

### Security
- Spring Security for auth
- BCrypt password encoding
- Parameterized queries (SQL injection 방지)
- Output encoding (XSS 방지)

---

## Code Generation Template

새 도메인 기능 생성 시 아래 순서로 파일 생성:

```
1. domain/aggregate/{Name}.java          — Aggregate Root
2. domain/repository/{Name}Repository.java — Repository Port
3. application/command/{Action}{Name}Command.java — Command DTO
4. application/result/{Name}Result.java   — Result DTO
5. application/usecase/{Action}{Name}UseCase.java — UseCase Interface
6. application/usecase/impl/{Action}{Name}UseCaseImpl.java — UseCase Impl
7. infrastructure/persistence/adapter/{Name}RepositoryAdapter.java — Adapter
8. infrastructure/persistence/mybatis/{Name}Mapper.java — MyBatis Mapper
9. interfaces/dto/{role}/request/{Action}{Name}Request.java — Request DTO
10. interfaces/dto/{role}/response/{Name}Response.java — Response DTO
11. interfaces/mapper/{Name}DtoMapper.java — DTO Mapper
12. interfaces/api/{role}/{Role}{Name}Controller.java — Controller
13. support/exception/{Name}ErrorCode.java — Error Code
```

---

## Agent Integration

Jay 에이전트가 Spring Boot 프로젝트에서 작업 시:
1. 프로젝트 루트에서 `pom.xml` 또는 `build.gradle` 존재 확인
2. 기존 패키지 구조 스캔 — DDD 구조 여부 판단
3. DDD 구조가 있으면 일관성 유지, 없으면 새 도메인에서부터 적용
4. Best Practices 체크리스트를 코드 생성 시 자동 검증

## Checklist (코드 생성/리뷰 시)
- [ ] Controller가 Entity를 직접 반환하지 않는가?
- [ ] UseCase가 interface + impl로 분리되어 있는가?
- [ ] Domain layer에 Spring 의존성이 없는가?
- [ ] Repository가 interface(port)로 domain에 정의되어 있는가?
- [ ] Constructor injection을 사용하는가?
- [ ] `@Transactional`이 UseCase impl에 있는가?
- [ ] Request DTO에 `@Valid` 검증이 있는가?
- [ ] Logging이 parameterized 방식인가?
