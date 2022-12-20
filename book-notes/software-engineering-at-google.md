# Software Engineering at Google

> The Software Engineering at Google book (“SWE Book”) is not about programming, per se, but about the engineering practices utilized at Google to make their codebase sustainable and healthy.
> (These practices are paramount for common infrastructural code such as Abseil.)

[Free Book](https://abseil.io/resources/swe-book)

## Notes

> Rather than take the natural approach by avoiding a painful task, sometimes the more responsible answer is to invest in making it less painful.
> It all depends on the cost of your upgrade, the value it provides, and the expected life span of the project in question.

> …about "it works" versus "it is maintainable" is what we’ve come to call Hyrum’s Law:
  With a sufficient number of users of an API, it does not matter what you promise in the contract: all observable behaviors of your system will be depended on by somebody.

> Does the amount of work our engineer must perform grow as a function of the size of the organization?
  Does the work scale up with the size of the codebase?
  If either of these are true, do we have any mechanisms in place to automate or optimize that work? If not, we have scaling problems.

> Through this and other experiences, we’ve discovered many factors that affect the flexibility of a codebase: **Expertise**: We know how to do this; for some languages, we’ve now done hundreds of compiler upgrades across many platforms. Stability There is less change between releases because we adopt releases more regularly; for some languages, we’re now deploying compiler upgrades every week or two. **Conformity**: There is less code that hasn’t been through an upgrade already, again because we are upgrading regularly. **Familiarity**: Because we do this regularly enough, we can spot redundancies in the process of performing an upgrade and attempt to automate. This overlaps significantly with SRE views on toil. **Policy**: We have processes and policies like the Beyoncé Rule. The net effect of these processes is that upgrades remain feasible because infrastructure teams do not need to worry about every unknown usage, only the ones that are visible in our CI system…

> Stagnation is an option, but often not a wise one.

> In the end, decisions in an engineering group should come down to very few things: • We are doing this because we must (legal requirements, customer requirements). • We are doing this because it is the best option (as determined by some appropriate decider) we can see at the time, based on current evidence. Decisions should not be “We are doing this because I said so.”

> A good postmortem should include the following: • A brief summary of the event • A timeline of the event, from discovery through investigation to resolution • The primary cause of the event • Impact and damage assessment • A set of action items (with owners) to fix the problem immediately • A set of action items to prevent the event from happening again • Lessons learned

> It’s better to do this listening before putting a stake in the ground or firmly announcing a decision—if you’re constantly changing your mind, people will think you’re wishy-washy.

> Although a measure of technical leadership is expected at higher levels, not all leadership is directed at technical problems. Leaders improve the quality of the people around them, improve the team’s psychological safety, create a culture of teamwork and collaboration, defuse tensions within the team, set an example of Google’s culture and values, and make Google a more vibrant and exciting place to work. Jerks are not good leaders.

> Psychological safety is the foundation for fostering a knowledge-sharing environment. • Start small: ask questions and write things down. • Make it easy for people to get the help they need from both human experts and documented references. • At a systemic level, encourage and reward those who take time to teach and broaden their expertise beyond just themselves, their team, or their organization. • There is no silver bullet: empowering a knowledge-sharing culture requires a combination of multiple strategies, and the exact mix that works best for your organization will likely change over time.

> At Google, we use the Goals/Signals/Metrics (GSM) framework to guide metrics creation. • A goal is a desired end result. It’s phrased in terms of what you want to understand at a high level and should not contain references to specific ways to measure it. • A signal is how you might know that you’ve achieved the end result. Signals are things we would like to measure, but they might not be measurable themselves. • A metric is proxy for a signal. It is the thing we actually can measure. It might not be the ideal measurement, but it is something that we believe is close enough.

> A goal should be written in terms of a desired property, without reference to any metric. By themselves, these goals are not measurable, but a good set of goals is something that everyone can agree on before proceeding onto signals and then metrics.

> There are roughly three categories into which all style guide rules fall: • Rules to avoid dangers • Rules to enforce best practices • Rules to ensure consistency

> Tooling also makes enforcement scalable. As an organization grows, a single team of experts can write tools that the rest of the company can use. If the company doubles in size, the effort to enforce all rules across the entire organization doesn’t double, it costs about the same as it did before.

> As much as a code review of entirely new code should not come out of the blue, the code review process itself should also not be viewed as an opportunity to revisit previous decisions.

> Code review also has important cultural benefits: it reinforces to software engineers that code is not “theirs” but in fact part of a collective enterprise. Such psychological benefits can be subtle but are still important.

> Some of the best modifications to a codebase are actually deletions! Getting rid of dead or obsolete code is one of the best ways to improve the overall code health of a codebase.

> Addressing the bug with a revised test is often necessary. The bug surfaced because existing tests were either inadequate, or the code had certain assumptions that were not met. As a reviewer of a bug fix, it is important to ask for updates to unit tests if applicable.

> • Code review has many benefits, including ensuring code correctness, comprehension, and consistency across a codebase. • Always check your assumptions through someone else; optimize for the reader. • Provide the opportunity for critical feedback while remaining professional. • Code review is important for knowledge sharing throughout an organization. • Automation is critical for scaling the process. • The code review itself provides a historical record.

> The prevalent usage of “go/ links” at Google (see Chapter 3) makes this process easier. Documents with straightforward go/ links often become the canonical source of truth. One other way to promote canonical documents is to associate them directly with the code they document by placing them directly under source control and alongside the source code itself.

> But as Google scaled, problems with a wiki-style approach became apparent. Because there were no true owners for documents, many became obsolete. 3Because no process was put in place for adding new documents, duplicate documents and document sets began appearing. GooWiki had a flat namespace, and people were not good at applying any hierarchy to the documentation sets.

> The way to improve the situation was to move important documentation under the same sort of source control that was being used to track code changes. Documents began to have their own owners, canonical locations within the source tree, and processes for identifying bugs and fixing them; the documentation began to dramatically improve.

> As Blaise Pascal once said, “If I had more time, I would have written you a shorter letter.” By keeping a document short and clear, you will ensure that it will satisfy both an expert and a novice.

> Most tutorials require you to perform a number of steps, in order. In those cases, number those steps explicitly. If the focus of the tutorial is on the user (say, for external developer documentation), then number each action that a user needs to undertake. Don’t number actions that the system may take in response to such user actions.

> Concept” documents are the most difficult forms of documentation to write. As a result, they are often the most neglected type of document within a software engineer’s toolbox. One problem engineers face when writing conceptual documentation is that it often cannot be embedded directly within the source code because there isn’t a canonical location to place it. Some APIs have a relatively broad API surface area, in which case, a file comment might be an appropriate place for a “conceptual” explanation of the API. But often, an API works in conjunction with other APIs and/or modules. The only logical place to document such complex behavior is through a separate conceptual document. If comments are the unit tests of documentation, conceptual documents are the integration tests.

> …are actually straightforward to fix: ensure that a landing page clearly identifies its purpose, and then include only links to other pages for more information. If something on a landing page is doing more than being a traffic cop, it is not doing its job.

> As a result, there’s a tendency for software engineers to jump straight into the “HOW” on any given document and ignore the other questions associated with it: the WHO, WHAT, WHEN, WHERE, and WHY.

> Try to address the other questions in the first two paragraphs of any document: • WHO was discussed previously: that’s the audience. But sometimes you also need to explicitly call out and address the audience in a document. Example: “This document is for new engineers on the Secret Wizard project.” • WHAT identifies the purpose of this document: “This document is a tutorial designed to start a Frobber server in a test environment.” Sometimes, merely writing the WHAT helps you frame the document appropriately. If you start adding information that isn’t applicable to the WHAT, you might want to move that information into a separate document. • WHEN identifies when this document was created, reviewed, or updated. Documents in source code have this date noted implicitly, and some other publishing schemes automate this as well. But, if not, make sure to note the date on which the document was written (or last revised) on the document…

> WHERE is often implicit as well, but decide where the document should live. Usually, the preference should be under some sort of version control, ideally with the source code it documents. But other formats work for different purposes as well. At Google, we often use Google Docs for easy collaboration, particularly on Documentation Philosophy | 201

> design issues. At some point, however, any shared document becomes less of a discussion and more of a stable historical record. At that point, move it to someplace more permanent, with clear ownership, version control, and responsibility. • WHY sets up the purpose for the document. Summarize what you expect someone to take away from the document after reading it. A good rule of thumb is to establish the WHY in the introduction to a document. When you write the summary, verify whether you’ve met your original expectations (and revise accordingly).

> Traditionally, the first section denotes the problem, the middle section goes through the recommended solutions, and the conclusion summarizes the takeaways.

> Most engineers loathe redundancy, and with good reason. But in documentation, redundancy is often useful.

> Just like old code can cause problems, so can old documents.

> Companies that can iterate faster can adapt more rapidly to changing technologies, market conditions, and customer tastes. If you have a robust testing practice, you needn’t fear change—you can embrace it as an essential quality of developing software. The more and faster you want to change your systems, the more you need a fast way to test them.

> The simplest test is defined by: • A single behavior you are testing, usually a method or API that you are calling • A specific input, some value that you pass to the API • An observable output or behavior • A controlled environment such as a single isolated process

> A bad test suite can be worse than no test suite at all.

> Allowing failing tests to pile up quickly defeats any value they were providing, so it is imperative not to let that happen. Teams that prioritize fixing a broken test within minutes of a failure are able to keep confidence high and failure isolation fast, and therefore derive more value out of their tests.

> One of the lessons we learned fairly early on is that engineers favored writing larger, system-scale tests, but that these tests were slower, less reliable, and more difficult to debug than smaller tests.

> …you can limit the impact of flaky tests by automatically rerunning them when they fail. This is effectively trading CPU cycles for engineering time. At low levels of flakiness, this trade-off makes sense. Just keep in mind that rerunning a test is only delaying the need to address the root cause of flakiness.

> It doesn’t take needing to investigate many flakes before a team loses trust in the test suite. After that happens, engineers will stop reacting to test failures, eliminating any value the test suite provided.

> For example, we run all Java tests using a custom security manager that will cause all tests tagged as small to fail if they attempt to do something prohibited, such as establish a network connection.

> Some of the worst offenders of brittle tests come from the misuse of mock objects. Google’s codebase has suffered so badly from an abuse of mocking frameworks that it has led some engineers to declare “no more mocks!” Although that is a strong statement,…

> Failing to keep a test suite deterministic and fast ensures it will become roadblock to productivity.

> …tool called Project Health (pH). The pH tool continuously gathers dozens of metrics on the health of a project, including test coverage and test latency, and makes them available internally. pH is measured on a scale of one (worst) to five (best). A pH-1 project is seen as a problem for the team to address. Almost every team that runs a continuous build automatically gets a pH score.

> Why didn’t we start by mandating the writing of tests? The Testing Grouplet had considered asking for a testing mandate from senior leadership but quickly decided against it. Any mandate on how to develop code would be seriously counter to Google culture and likely slow the progress, independent of the idea being mandated. The belief was that successful ideas would spread, so the focus became demonstrating success. If engineers were deciding to write tests on their own, it meant that they had fully accepted the idea and were likely to keep doing the right thing—even if no one was compelling them to.

> After preventing bugs, the most important purpose of a test is to improve engineers’ productivity.

> As just defined, a brittle test is one that fails in the face of an unrelated change to production code that does not introduce any real bugs.

> Note that this is slightly different from a flaky test, which fails nondeterministically without any change to production code.

> Fixing a bug is much like adding a new feature: the presence of the bug suggests that a case was missing from the initial test suite, and the bug fix should include that missing test case.

> …an appropriate scope for a unit and hence what should be considered the public API is more art than science, but here are some rules of thumb: • If a method or class exists only to support one or two other classes (i.e., it is a “helper class”), it probably shouldn’t be considered its own unit, and its functionality should be tested through those classes instead of directly. • If a package or class is designed to be accessible by anyone without having to consult with its owners, it almost certainly constitutes a unit that should be tested directly, where its tests access the unit in the same way that the users would.

> Two high-level properties that help tests achieve clarity are completeness and conciseness. A test is complete when its body contains all of the information a reader needs in order to understand how it arrives at its result. A test is concise when it contains no other distracting or irrelevant information.

> ...vit can often be worth violating the DRY (Don’t Repeat Yourself) principle if it leads to clearer tests. Remember: a test’s body should contain all of the information needed to understand it without containing any irrelevant or distracting information.

> Furthermore, a feature (in the product sense of the word) can be expressed as a collection of behaviors.

> Tests are clearest when this structure is explicit. Some frameworks like Cucumber and Spock directly bake in given/when/then. 

> Each test should cover only a single behavior, and the vast majority of unit tests require only one “when” and one “then” block.

> The test name is very important: it will often be the first or only token visible in failure reports, so it’s your best opportunity to communicate the problem when the test breaks. It’s also the most straightforward way to express the intent of the test.

> When a piece of code contains logic, you need to do a bit of mental computation to determine its result instead of just reading it off of the screen. It doesn’t take much logic to make a test more difficult to reason about.

> .. in test code, stick to straight-line code over clever logic, and consider tolerating some duplication when it makes the test more descriptive and meaningful.

> A good failure message contains much the same information as the test’s name: it should clearly express the desired outcome, the actual outcome, and any relevant parameters.

> Engineers are usually drawn to using shared constants because constructing individual values in each test can be verbose. A better way to accomplish this goal is to construct data using helper methods (see Example 12-22) that require the test author to specify only values they care about, and setting reasonable defaults for all other values. This construction is trivial to do in languages that support named parameters, but languages without named parameters can use constructs such as the Builder pattern

> The best use case for setup methods is to construct the object under tests and its collaborators. This is useful when the majority of tests don’t care about the specific arguments used to construct those objects and can let them stay in their default states…

> One common type of helper is a method that performs a common set of assertions against a system under test. The extreme example is a validate method called at the end of every test method, which performs a set of fixed checks against the system under test. Such a validation strategy can be a bad habit to get into because tests using this approach are less behavior driven. With such tests, it is much more difficult to determine the intent of any particular test and to infer what exact case the author had in mind when writing it. When bugs are introduced, this strategy can also make them more difficult to localize because they will frequently cause a large number of tests to start failing. 254 | Chapter 12: Unit Testing

> More focused validation methods can still be useful, however. The best validation helper methods assert a single conceptual fact about their inputs, in contrast to general-purpose validation methods that cover a range of conditions. Such methods can be particularly helpful when the condition that they are validating is conceptually simple but requires looping or conditional logic to implement that would reduce clarity were it included in the body of a test method. For example, the helper method in Example 12-25 might be useful in a test covering several different cases around account access.

Example 12-25. A conceptually simple test
```java
private void assertUserHasAccessToAccount(User user, Account account) { 
    for (long userId : account.getUsersWithAccess()) { 
        if (user.getId() == userId) { 
            return; 
        } 
    } 
    fail(user.getName() + " cannot access " + account.getName()); 
}
```

> • Strive for unchanging tests. • Test via public APIs. • Test state, not interactions. • Make your tests complete and concise. • Test behaviors, not methods. • Structure tests to emphasize behaviors. • Name tests after the behavior being tested. • Don’t put logic in tests. • Write clear failure messages.

> A fake is a lightweight implementation of an API that behaves similar to the real implementation but isn’t suitable for production; for example, an in-memory database.

> Stubbing is the process of giving behavior to a function that otherwise has no behavior on its own—you specify to the function exactly what values to return (that is, you stub the return values).

> At Google, the preference for real implementations developed over time as we saw that overuse of mocking frameworks had a tendency to pollute tests with repetitive code that got out of sync with the real implementation and made refactoring difficult.

> Preferring real implementations in tests is known as classical testing. There is also a style of testing known as mockist testing, in which the preference is to use mocking frameworks instead of real implementations.

> For example, a real implementation should be used for a value object.

> Because of this, the team that owns the real implementation should write and maintain a fake.

> One approach to writing tests for fakes involves writing tests against the API’s public interface and running those tests against both the real implementation and the fake (these are known as contract tests). The tests that run against the real implementation will likely be slower, but their downside is minimized because they need to be run only by the owners of the fake.

> A key sign that stubbing isn’t appropriate for a test is if you find yourself mentally stepping through the system under test in order to understand why certain functions in the test are stubbed.

> Stubbing leaks implementation details of your code into your test. When implementation details in your production code change, you’ll need to update your tests to reflect these changes. Ideally, a good test should need to change only if user-facing behavior of an API changes; it should remain unaffected by changes to the API’s implementation.

> …with stubbing there is no way to store state, which can make it difficult to test certain aspects of your code. For example, if you call database.save(item) on either a real implementation or a fake, you might be able to retrieve the item by calling database.get(item.id()) given that both of these calls are accessing internal state, but with stubbing, there is no way to do this.

> Because a function’s behavior is defined inline in the test, stubbing can simulate a wide variety of return values or errors that might not be possible to trigger from a real implementation or a fake.

> Mocking frameworks make it easy to perform interaction testing. However, to keep tests useful, readable, and resilient to change, it’s important to perform interaction testing only when necessary.

> With state testing, you call the system under test and validate that either the correct value was returned or that some other state in the system under test was properly changed.

> State testing  At Google, we’ve found that emphasizing state testing is more scalable; it reduces test brittleness, making it easier to change and maintain code over time.

> There are some cases for which interaction testing is warranted: • You cannot perform state testing because you are unable to use a real implementation or a fake (e.g., if the real implementation is too slow and no fake exists). As a fallback, you can perform interaction testing to validate that certain functions are called. Although not ideal, this does provide some basic level of confidence that the system under test is working as expected. • Differences in the number or order of calls to a function would cause undesired behavior. Interaction testing is useful because it could be difficult to validate this behavior with state testing. For example, if you expect a caching feature to reduce the number of calls to a database, you can verify that the database object is not accessed more times than expected. Using Mockito, the code might look similar to this: `verify(databaseReader, atMostOnce()).selectRecords();`

> …you should perform interaction testing only for functions that are state- changing. Performing interaction testing for non-state-changing functions is usually redundant given that the system under test will use the return value of the function to do other work that you can assert. The interaction itself is not an important detail for correctness, because it has no side effects.

> • A real implementation should be preferred over a test double. • A fake is often the ideal solution if a real implementation can’t be used in a test. • Overuse of stubbing leads to tests that are unclear and brittle. • Interaction testing should be avoided when possible: it leads to tests that are brittle because it exposes implementation details of the system under test.

> At Google, configuration changes are the number one reason for our major outages.

> …larger tests present two other challenges. First, there is a challenge of ownership. A unit test is clearly owned by the engineer (and team) who owns the unit. A larger test spans multiple units and thus can span multiple owners. This presents a long-term ownership challenge: who is responsible for maintaining the test and who is responsible for diagnosing issues when the test breaks? Without clear ownership, a test rots.

> Even for integration tests, smaller is better—a handful of large tests is preferable to an enormous one.

> One way to achieve this test ratio when presented with a user journey that can require contributions from many internal systems is to “chain” tests, as illustrated in Figure 14-4, not specifically in their execution, but to create multiple smaller pairwise integration tests that represent the overall scenario. This is done by ensuring that the output of one test is used as the input to another test by persisting this output to a data repository.

> Any defects found by exploratory tests should be replicated with an automated test that can run much more frequently.

> Hyrum’s Law states, the actual public API is not the declared one but all user-visible aspects of a product.

> Many of Google’s products historically have been created by the software engineers themselves. There has been little need for runnable specification languages because those defining the intended product behavior are often fluent in the actual coding languages themselves.

> Note that tests that rely on sleeps and timeouts will all start failing when the fleet running those tests becomes overloaded, which spirals because those tests need to be rerun more often, increasing the load further.

> A team should view eliminating flakiness of such tests as a high priority.

> Tests that are assertive must provide a clear pass/fail signal and must provide meaningful error output to help triage the source of failure.

> …stack trace is not useful for larger tests because the call chain can span multiple process boundaries. Instead, it’s necessary to produce a trace across the call chain or to invest in automation that can narrow down the culprit. The test should produce some kind of artifact to this effect. For example, Dapper is a framework used by Google to associate a single request ID with all the requests in an RPC call chain, and all of the associated logs for that request can be correlated by that ID to facilitate tracing.

> • Extra effort must be made with larger tests to keep them from creating friction in the developer workflow.

> Deprecation is best suited for systems that are demonstrably obsolete and a replacement exists that provides comparable functionality. The new system might use resources more efficiently, have better security properties, be built in a more sustainable fashion, or just fix bugs.

> The alternative requires a different paradigm: trunk-based development, rely heavily on testing and CI, keep the build green, and disable incomplete/untested features at runtime.

> The primary difference between a dev branch and a release branch is the expected end state: a dev branch is expected to merge back to trunk, and could even be further branched by another team. A release branch is expected to be abandoned eventually.

> That same DORA research also suggests a strong positive correlation between “trunk- based development,” “no long-lived dev branches,” and good technical outcomes.

> The “One-Version” Rule With that example in mind, on top of the Single Source of Truth model, we can hopefully understand the depth of this seemingly simple rule for source control and branch management: Developers must never have a choice of “What version of this component should I depend upon?” Colloquially, this becomes something like a “One-Version Rule.” In practice, “One- Version” is not hard and fast, 11but phrasing this around limiting the versions that can be chosen when adding a new dependency conveys a very powerful understanding. For an individual developer, lack of choice can seem like an arbitrary impediment. Yet we see again and again that for an organization, it’s a critical component in efficient scaling. Consistency has a profound importance at all levels in an organization. From one perspective, this is a direct side effect of discussions about consistency and ensuring the ability to leverage consistent “choke points.”

> We’ll more generally recognize that version numbers are timestamps, and that allowing version skew adds a dimensionality complexity (time) that costs a lot—and that we can learn to avoid.

> Choice leads to costs here. We highly endorse the One-Version Rule presented here: developers within an organization must not have a choice where to commit, or which version of an existing component to depend upon.

> Use whatever version control system makes sense for you. If your organization wants to prioritize separate repositories for separate projects, it’s still probably wise for interrepository dependencies to be unpinned/“at head”/“trunk based.” There are an in…

> Reframing the build process in terms of artifacts rather than tasks is subtle but powerful. By reducing the flexibility exposed to the programmer, the build system can know more about what is being done at every step of the build. It can use this knowledge to make the build far more efficient by parallelizing build processes and reusing their outputs.

> Communication problems are rarely solved through tooling.

> Critique publishes event notifications that might be used by other supporting tools. This notification model allows Critique to focus on being a primary code review tool instead of a general purpose tool, while still being integrated into the developer workflow.

> • Trust and communication are core to the code review process. A tool can enhance the experience, but it can’t replace them.

> For static analysis, a “false negative” is when a piece of code contains an issue that the analysis tool was designed to find, but the tool misses it. A “false positive” occurs when a tool incorrectly flags code as having the issue. Research about static analysis tools traditionally focused on reducing false negatives; in practice, low false-positive rates are often critical for developers to actually want to use a tool—who wants to wade through hundreds of false reports in search of a few true ones?

> The Deleted Artifact Analyzer warns if a source file is deleted that is referenced by other non-code places in the codebase (such as inside checked-in documentation).

> We also aim to never issue compiler warnings. We have found repeatedly that developers ignore compiler warnings.

> • Make static analysis part of the core developer workflow. The main integration point for static analysis at Google is through code review, where analysis tools provide fixes and involve reviewers.

> Live at Head presupposes that we can unpin dependencies, drop SemVer, and rely on dependency providers to test changes against the entire ecosystem before committing. Live at Head is an explicit attempt to take time and choice out of the issue of dependency management: always depend on the current version of everything, and never change anything in a way in which it would be difficult for your dependents to adapt. A change that (unintentionally) alters API or behavior will in general be caught by CI on downstream dependencies, and thus should not be committed.

> …having teams that own the systems requiring LSCs helps align incentives to ensure the change gets done. In our experience, organic migrations are unlikely to fully succeed, in part because engineers tend to use existing code as examples when writing new code.

> …mantra: “No Haunted Graveyards.” A haunted graveyard in this sense is a system that is so ancient, obtuse, or complex that no one dares enter it. Haunted graveyards are often business-critical systems that are frozen in time because any attempt to change them could cause the system to fail in incomprehensible ways, costing the business real money.

> When software is thoroughly tested, we can make arbitrary changes to it and know with confidence whether those changes are breaking, no matter the age or complexity of the system.

> However, perhaps the most important support for LSCs has been the evolution of cultural norms around large-scale changes and the oversight given to them.

> Whatever tool your organization uses for change creation, it’s important that its human effort scale sublinearly with the codebase; in other words, it should take roughly the same amount of human time to generate the collection of all required changes, no matter the size of the repository.

> Language choice is, in many respects, intimately tied to the question of code lifespan: languages that tend to be viewed as more focused on developer productivity tend to be more difficult to maintain.

> We often use the “cattle and pets” analogy when referring to individual machines in a distributed computing environment, but the same principles can apply to changes within a codebase.

> Continuous Integration (2): the continuous assembling and testing of our entire complex and rapidly evolving ecosystem.

> Canarying—or deploying to a small percentage of production first—can help minimize issues that do make it to production, with a subset-of-production initial feedback loop preceding all-of-production. However, canarying can cause problems, too, particularly around compatibility between deployments when multiple versions are deployed at once.

> Remember, a large percentage of production bugs are caused by “silly” configuration problems, so it’s just as important to test your configuration as it is your code (and to test it along with the same code that will use it).

> As an RC progresses through environments, its artifacts (e.g., binaries, containers) ideally should not be recompiled or rebuilt. Using containers such as Docker helps enforce consistency of an RC between environments, from local development onward.

> Engineer productivity is extremely valuable, and waiting a long time to run every test during code submission can be severely disruptive.

> Another reason is that during the time we run presubmit tests to confirm that a change is safe, the underlying repository might have changed in a manner that is incompatible with the changes being tested.

> So, which tests should be run on presubmit? Our general rule of thumb is: only fast, reliable ones. You can accept some loss of coverage on presubmit, but that means you need to catch any issues that slip by on post-submit, and accept some number of rollbacks.

> A flaky test that fails every few CI runs is just as much of a problem as a spurious alert going off every few minutes and generating a page for the on-call. If it isn’t actionable, it shouldn’t be alerting. If it isn’t actually violating the invariants of the SUT, it shouldn’t be a test failure.

> Brittle tests fail when an arbitrary test requirement or invariant is violated, without there necessarily being a fundamental connection between that invariant and the correctness of the software being tested.

> If CI reports an issue, such failures should definitely be investigated before letting people commit or compound the issue. But if the root cause is well understood and clearly would not affect production, blocking commits is unreasonable.

> Hermetic tests: tests run against a test environment (i.e., application servers and resources) that is entirely self-contained (i.e., no external dependencies like production backends).

> Without a CB, running tests is usually left to individual engineer discretion, and that often leads to a few motivated engineers trying to run all tests and keep up with the failures.

> To deal with such breakages, each team has a “Build Cop.” The Build Cop’s responsibility is keeping all the tests passing in their particular project, regardless of who breaks them. When a Build Cop is notified of a failing test in their project, they drop whatever they are doing and fix the build.

> To speed up failure identification, we use two different approaches. First, TAP automatically splits a failing batch up into individual changes and reruns the tests against each change in isolation. This process can sometimes take a while to converge on a failure, so in addition, we have created culprit finding tools that an individual developer can use to binary search through a batch of changes and identify which one is the likely culprit.

> The presence of failing tests can quickly begin to erode confidence in the test suite. As mentioned previously, fixing a broken build is the responsibility of the Build Cop. The most effective tool the Build Cop has is the rollback.

> Google’s distributed build tools, Forge and Blaze, maintain a near-real-time version of the global dependency graph and make it available to TAP. As a result, TAP can quickly determine which tests are downstream from any change and run the minimal set to be sure the change is safe.

> At Google, we prefer that teams continue to develop at head in the shared codebase and set up CI testing, automatic rollbacks, and culprit finding to identify issues quickly.

> When the operational cost of a release is this high, a cycle begins to develop in which you wait to push out your release until you’re able to test it a bit more. Meanwhile, someone wants to add just one more feature that’s almost ready, and pretty soon you have yourself a release process that’s laborious, error prone, and slow. Worst of all, the experts who did the release last time are burned out and have left the team, and now nobody even knows how to troubleshoot those strange crashes that happen when you try to release an update, leaving you panicky at the very thought of pushing that button.

> In Google’s experience, the choice of managing cattle (and not pets) is the solution to managing at scale. To reiterate, if each of your teams will need just one pet machine in each of your datacenters, your management costs will rise superlinearly with yo…

> • Scale requires a common infrastructure for running workloads in production.
